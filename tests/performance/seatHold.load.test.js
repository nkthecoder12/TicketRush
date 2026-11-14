import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { expect, test } from "vitest";
import pool from "../../config/db.js";
import { createSeatHoldService } from "../../services/events.service.js";

const DEDICATED_TEST_DATABASE = "ticketrush_test1";
const REQUEST_COUNT = 500;
const SEAT_COUNT = 50;
const REQUESTS_PER_SEAT = REQUEST_COUNT / SEAT_COUNT;

const EXPECTED_CONFLICT_MESSAGES = new Set([
  "One or more seats are already booked",
  "Unable to hold all seats",
  "One or more seats are already held by another request",
]);

function percentile(values, fraction) {
  const sortedValues = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(fraction * sortedValues.length) - 1);
  return sortedValues[index];
}

async function seedFixtures(fixtures) {
  const runId = randomUUID();

  const organizerResult = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'ORGANIZER')
     RETURNING id`,
    [
      `Seat Hold Load Organizer ${runId}`,
      `seat-hold-load-organizer-${runId}@test.invalid`,
      "load-test-password-hash",
    ],
  );
  fixtures.organizerId = organizerResult.rows[0].id;

  const requestUsers = Array.from({ length: REQUEST_COUNT }, (_, index) => ({
    name: `Seat Hold Load User ${index + 1}`,
    email: `seat-hold-load-${runId}-${index + 1}@test.invalid`,
    passwordHash: "load-test-password-hash",
  }));
  const userValues = [];
  const userValueRows = requestUsers.map((user, index) => {
    const firstParameter = index * 3 + 1;
    userValues.push(user.name, user.email, user.passwordHash);
    return `($${firstParameter}, $${firstParameter + 1}, $${firstParameter + 2}, 'USER')`;
  });
  
  const usersResult = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ${userValueRows.join(", ")}
     RETURNING id, email`,
    userValues,
  );
  fixtures.requestUsers = usersResult.rows;

  if (fixtures.requestUsers.length !== REQUEST_COUNT) {
    throw new Error(
      `Expected ${REQUEST_COUNT} request users, created ${fixtures.requestUsers.length}`,
    );
  }

  const venueResult = await pool.query(
    `INSERT INTO venues (name, address, capacity, city)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      `Seat Hold Load Venue ${runId}`,
      "Temporary venue for seat-hold load testing",
      SEAT_COUNT,
      "Test City",
    ],
  );
  fixtures.venueId = venueResult.rows[0].id;

  const eventResult = await pool.query(
    `INSERT INTO events (
       title, description, category, start_date, end_date, price,
       status, created_by, venue_id
     )
     VALUES (
       $1, $2, 'LOAD_TEST', NOW() + INTERVAL '1 day',
       NOW() + INTERVAL '1 day 2 hours', 10, 'published', $3, $4
     )
     RETURNING id`,
    [
      `Seat Hold Load Event ${runId}`,
      "Temporary event for seat-hold load testing",
      fixtures.organizerId,
      fixtures.venueId,
    ],
  );
  fixtures.eventId = eventResult.rows[0].id;

  const physicalSeatsResult = await pool.query(
    `INSERT INTO seats (venue_id, section, row_label, seat_number)
     SELECT $1, 'LOAD', 'R' || rows.row_number, seat_numbers.seat_number
     FROM generate_series(1, 5) AS rows(row_number)
     CROSS JOIN generate_series(1, 10) AS seat_numbers(seat_number)
     RETURNING id`,
    [fixtures.venueId],
  );

  if (physicalSeatsResult.rows.length !== SEAT_COUNT) {
    throw new Error(
      `Expected ${SEAT_COUNT} physical seats, created ${physicalSeatsResult.rows.length}`,
    );
  }

  await pool.query(
    `INSERT INTO event_seats (event_id, seat_id, price, status)
     SELECT $1, id, 10, 'AVAILABLE'
     FROM seats
     WHERE venue_id = $2`,
    [fixtures.eventId, fixtures.venueId],
  );

  const eventSeatsResult = await pool.query(
    `SELECT id
     FROM event_seats
     WHERE event_id = $1
     ORDER BY id`,
    [fixtures.eventId],
  );
  fixtures.eventSeatIds = eventSeatsResult.rows.map((row) => String(row.id));

  if (fixtures.eventSeatIds.length !== SEAT_COUNT) {
    throw new Error(
      `Expected ${SEAT_COUNT} event seats, created ${fixtures.eventSeatIds.length}`,
    );
  }
}

async function cleanupFixtures(fixtures) {
  const cleanupErrors = [];
  const attempt = async (label, query, values) => {
    try {
      await pool.query(query, values);
    } catch (error) {
      cleanupErrors.push(new Error(`${label}: ${error.message}`));
    }
  };

  if (fixtures.eventId) {
    await attempt(
      "deleting test idempotency records",
      `DELETE FROM idempotency_requests WHERE event_id = $1`,
      [fixtures.eventId],
    );
    await attempt(
      "deleting test seat holds",
      `DELETE FROM seat_holds
       WHERE event_seat_id IN (
         SELECT id FROM event_seats WHERE event_id = $1
       )`,
      [fixtures.eventId],
    );
    await attempt(
      "deleting test event seats",
      `DELETE FROM event_seats WHERE event_id = $1`,
      [fixtures.eventId],
    );
    await attempt("deleting test event", `DELETE FROM events WHERE id = $1`, [
      fixtures.eventId,
    ]);
  }

  if (fixtures.venueId) {
    await attempt(
      "deleting test physical seats",
      `DELETE FROM seats WHERE venue_id = $1`,
      [fixtures.venueId],
    );
    await attempt("deleting test venue", `DELETE FROM venues WHERE id = $1`, [
      fixtures.venueId,
    ]);
  }

  if (fixtures.requestUsers.length > 0) {
    await attempt(
      "deleting test request users",
      `DELETE FROM users WHERE id = ANY($1::uuid[])`,
      [fixtures.requestUsers.map((user) => user.id)],
    );
  }

  if (fixtures.organizerId) {
    await attempt(
      "deleting test organizer",
      `DELETE FROM users WHERE id = $1`,
      [fixtures.organizerId],
    );
  }

  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Load-test fixture cleanup failed");
  }
}

test("holds one seat per ten concurrent requests without double booking", async () => {
  const databaseResult = await pool.query(
    "SELECT current_database() AS database",
  );
  const database = databaseResult.rows[0].database;

  if (database !== DEDICATED_TEST_DATABASE) {
    throw new Error(
      `Refusing to run the load test against "${database}"; expected "${DEDICATED_TEST_DATABASE}"`,
    );
  }

  const fixtures = {
    organizerId: null,
    requestUsers: [],
    venueId: null,
    eventId: null,
    eventSeatIds: [],
  };
  let loadError;

  try {
    await seedFixtures(fixtures);

    const requests = fixtures.requestUsers.map((user, index) => ({
      userId: user.id,
      eventSeatId: fixtures.eventSeatIds[Math.floor(index / REQUESTS_PER_SEAT)],
      idempotencyKey: randomUUID(),
    }));
    const latencies = new Array(requests.length);
    const poolOptions = pool.options;

    if (!Number.isInteger(poolOptions.max)) {
      throw new Error("Unable to determine the PostgreSQL pool maximum");
    }

    const loadStartedAt = performance.now();
    const outcomes = await Promise.allSettled(
      requests.map(async (request, index) => {
        const requestStartedAt = performance.now();

        try {
          return await createSeatHoldService(
            request.userId,
            fixtures.eventId,
            [request.eventSeatId],
            request.idempotencyKey,
          );
        } finally {
          latencies[index] = performance.now() - requestStartedAt;
        }
      }),
    );
    const durationMs = performance.now() - loadStartedAt;

    const successfulRequests = [];
    const rejectedRequests = [];
    const unexpectedFailures = [];

    outcomes.forEach((outcome, index) => {
      const request = requests[index];

      if (outcome.status === "fulfilled") {
        successfulRequests.push(request);
        return;
      }

      const error = outcome.reason;
      if (
        error?.statusCode === 409 &&
        EXPECTED_CONFLICT_MESSAGES.has(error.message)
      ) {
        rejectedRequests.push({ request, error });
        return;
      }

      unexpectedFailures.push({ request, error });
    });

    const seatStatsResult = await pool.query(
      `SELECT
           COUNT(*)::int AS total_count,
           COUNT(*) FILTER (WHERE status = 'HELD')::int AS held_count,
           COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available_count
         FROM event_seats
         WHERE event_id = $1`,
      [fixtures.eventId],
    );
    const seatStats = seatStatsResult.rows[0];

    const holdStatsResult = await pool.query(
      `SELECT
           COUNT(*)::int AS active_count,
           COUNT(DISTINCT seat_holds.event_seat_id)::int AS distinct_seat_count,
           COUNT(DISTINCT seat_holds.user_id)::int AS distinct_owner_count,
           COUNT(*) FILTER (
             WHERE NOT (seat_holds.user_id = ANY($2::uuid[]))
           )::int AS invalid_owner_count
         FROM seat_holds
         JOIN event_seats ON event_seats.id = seat_holds.event_seat_id
         WHERE event_seats.event_id = $1
           AND seat_holds.status = 'ACTIVE'
           AND seat_holds.expires_at > NOW()`,
      [fixtures.eventId, fixtures.requestUsers.map((user) => user.id)],
    );
    const holdStats = holdStatsResult.rows[0];

    const duplicateHoldsResult = await pool.query(
      `SELECT COUNT(*)::int AS duplicate_seat_count
         FROM (
           SELECT seat_holds.event_seat_id
           FROM seat_holds
           JOIN event_seats ON event_seats.id = seat_holds.event_seat_id
           WHERE event_seats.event_id = $1
             AND seat_holds.status = 'ACTIVE'
             AND seat_holds.expires_at > NOW()
           GROUP BY seat_holds.event_seat_id
           HAVING COUNT(*) > 1
         ) AS duplicated_seats`,
      [fixtures.eventId],
    );
    const duplicateSeatCount =
      duplicateHoldsResult.rows[0].duplicate_seat_count;

    const idempotencyResult = await pool.query(
      `SELECT user_id, idempotency_key, status, response_body
         FROM idempotency_requests
         WHERE event_id = $1`,
      [fixtures.eventId],
    );
    const idempotencyRowsByUser = new Map();
    for (const row of idempotencyResult.rows) {
      const userRows = idempotencyRowsByUser.get(row.user_id) ?? [];
      userRows.push(row);
      idempotencyRowsByUser.set(row.user_id, userRows);
    }

    const successfulRequestByUser = new Map(
      successfulRequests.map((request) => [
        request.userId,
        request.idempotencyKey,
      ]),
    );
    const idempotencyProblems = [];

    for (const request of requests) {
      const rows = idempotencyRowsByUser.get(request.userId) ?? [];
      const expectedKey = successfulRequestByUser.get(request.userId);

      if (expectedKey === undefined) {
        if (rows.length !== 0) {
          idempotencyProblems.push(
            `Rejected user ${request.userId} has ${rows.length} idempotency rows`,
          );
        }
        continue;
      }

      if (
        rows.length !== 1 ||
        rows[0].idempotency_key !== expectedKey ||
        rows[0].status !== "completed" ||
        rows[0].response_body === null
      ) {
        idempotencyProblems.push(
          `Successful user ${request.userId} has an unexpected idempotency record`,
        );
      }
    }

    const unexpectedFailureDetails = unexpectedFailures.map(
      ({ request, error }) => ({
        userId: request.userId,
        eventSeatId: request.eventSeatId,
        statusCode: error?.statusCode ?? null,
        code: error?.code ?? null,
        message: error?.message ?? String(error),
      }),
    );
    const averageLatencyMs =
      latencies.reduce((total, latency) => total + latency, 0) /
      latencies.length;
    const throughput = REQUEST_COUNT / (durationMs / 1000);

    console.info(
      [
        "TicketRush PostgreSQL seat-hold load test",
        `Database: ${database}`,
        `Total requests: ${outcomes.length}`,
        `Available seats: ${SEAT_COUNT}`,
        `Successful holds: ${successfulRequests.length}`,
        `Rejected requests (expected 409): ${rejectedRequests.length}`,
        `Unexpected failures: ${unexpectedFailures.length}`,
        `Total execution time: ${durationMs.toFixed(2)} ms`,
        `Throughput: ${throughput.toFixed(2)} requests/second`,
        `Average request latency: ${averageLatencyMs.toFixed(2)} ms`,
        `p50 latency: ${percentile(latencies, 0.5).toFixed(2)} ms`,
        `p95 latency: ${percentile(latencies, 0.95).toFixed(2)} ms`,
        `p99 latency: ${percentile(latencies, 0.99).toFixed(2)} ms`,
        `Maximum latency: ${Math.max(...latencies).toFixed(2)} ms`,
        `Pool configuration: max=${poolOptions.max}, idleTimeoutMillis=${poolOptions.idleTimeoutMillis}, connectionTimeoutMillis=${poolOptions.connectionTimeoutMillis ?? 0}`,
        `Active unexpired holds: ${holdStats.active_count}`,
        `Event seats marked HELD: ${seatStats.held_count}/${seatStats.total_count}`,
        `Duplicate active-hold seats: ${duplicateSeatCount}`,
        `Completed idempotency records: ${idempotencyResult.rows.length}`,
        `Idempotency mismatches: ${idempotencyProblems.length}`,
        `Unexpected failure details: ${JSON.stringify(unexpectedFailureDetails)}`,
      ].join("\n"),
    );

    expect(requests).toHaveLength(REQUEST_COUNT);
    expect(outcomes).toHaveLength(REQUEST_COUNT);
    expect(successfulRequests).toHaveLength(SEAT_COUNT);
    expect(rejectedRequests).toHaveLength(REQUEST_COUNT - SEAT_COUNT);
    expect(unexpectedFailures).toHaveLength(0);

    expect(seatStats.total_count).toBe(SEAT_COUNT);
    expect(seatStats.held_count).toBe(SEAT_COUNT);
    expect(seatStats.available_count).toBe(0);

    expect(holdStats.active_count).toBe(SEAT_COUNT);
    expect(holdStats.distinct_seat_count).toBe(SEAT_COUNT);
    expect(holdStats.distinct_owner_count).toBe(SEAT_COUNT);
    expect(holdStats.invalid_owner_count).toBe(0);
    expect(duplicateSeatCount).toBe(0);

    expect(idempotencyResult.rows).toHaveLength(successfulRequests.length);
    expect(idempotencyProblems).toEqual([]);
  } catch (error) {
    loadError = error;
    throw error;
  } finally {
    try {
      await cleanupFixtures(fixtures);
    } catch (cleanupError) {
      if (loadError) {
        throw new AggregateError(
          [loadError, cleanupError],
          "Load test and fixture cleanup both failed",
        );
      }
      throw cleanupError;
    }
  }
}, 120_000);
