import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import pool from "../../config/db.js";
import { createSeatHoldService } from "../../services/events.service.js";
import {expirationRelease} from "../../jobs/expirationRelease.js";

describe("createSeatHoldService", () => {
  const suffix = randomUUID();
  const seatIds = [];
  let userId;
  let secondUserId;
  let venueId;
  let eventId;

  beforeAll(async () => {
    const databaseResult = await pool.query(
      "SELECT current_database() AS database",
    );
    const database = databaseResult.rows[0].database;

    if (!/_test\d*$/i.test(database)) {
      throw new Error(
        `Refusing to run seat-hold integration tests against "${database}"`,
      );
    }

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'USER')
       RETURNING id`,
      [`Seat Hold Test ${suffix}`, `seat-hold-${suffix}@test.invalid`, "test"],
    );
    userId = userResult.rows[0].id;

    const secondUserResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        `Customer Two ${suffix}`,
        `customer2-${suffix}@test.com`,
        "test-password-hash",
        "USER",
      ],
    );
    secondUserId = secondUserResult.rows[0].id;

    const venueResult = await pool.query(
      `INSERT INTO venues (name, address, capacity, city)
       VALUES ($1, $2, 3, $3)
       RETURNING id`,
      [`Seat Hold Test ${suffix}`, "Integration test venue", "Test City"],
    );
    venueId = venueResult.rows[0].id;

    const eventResult = await pool.query(
      `INSERT INTO events (
         title, category, start_date, end_date, price, status, created_by, venue_id
       )

       VALUES (
         $1, 'TEST', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours',
         10, 'published', $2, $3
       )
       RETURNING id`,
      [`Seat Hold Test ${suffix}`, userId, venueId],
    );
    
    eventId = eventResult.rows[0].id;

    for (let seatNumber = 1; seatNumber <= 3; seatNumber += 1) {
      const seatResult = await pool.query(
        `INSERT INTO seats (venue_id, section, row_label, seat_number)
         VALUES ($1, 'TEST', 'A', $2)
         RETURNING id`,
        [venueId, seatNumber],
      );

      const eventSeatResult = await pool.query(
        `INSERT INTO event_seats (event_id, seat_id, price, status)
         VALUES ($1, $2, 10, 'AVAILABLE')
         RETURNING id`,
        [eventId, seatResult.rows[0].id],
      );

      seatIds.push(String(eventSeatResult.rows[0].id));
    }
  });

  beforeEach(async () => {
    await pool.query(
      `DELETE FROM idempotency_requests
       WHERE event_id = $1`,
      [eventId],
    );
    await pool.query(
      `DELETE FROM seat_holds
       WHERE event_seat_id = ANY($1::bigint[])`,
      [seatIds],
    );
    await pool.query(
      `UPDATE event_seats
       SET status = 'AVAILABLE'
       WHERE id = ANY($1::bigint[])`,
      [seatIds],
    );
  });

  afterAll(async () => {
    if (eventId) {
      await pool.query(
        `DELETE FROM idempotency_requests
         WHERE event_id = $1`,
        [eventId],
      );
      await pool.query(
        `DELETE FROM seat_holds
         WHERE event_seat_id IN (
           SELECT id FROM event_seats WHERE event_id = $1
         )`,
        [eventId],
      );
      await pool.query("DELETE FROM event_seats WHERE event_id = $1", [
        eventId,
      ]);
      await pool.query("DELETE FROM events WHERE id = $1", [eventId]);
    }

    if (venueId) {
      await pool.query("DELETE FROM seats WHERE venue_id = $1", [venueId]);
    }

    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    if (secondUserId) {
      await pool.query("DELETE FROM users WHERE id = $1", [secondUserId]);
    }

    if (venueId) {
      await pool.query("DELETE FROM venues WHERE id = $1", [venueId]);
    }
  });

  test("holds seats and returns the saved response for an equivalent retry", async () => {
    const idempotencyKey = randomUUID();
    const requestedSeatIds = seatIds.slice(0, 2);

    const firstResponse = await createSeatHoldService(
      userId,
      eventId,
      requestedSeatIds,
      idempotencyKey,
    );
    const retryResponse = await createSeatHoldService(
      userId,
      eventId,
      [...requestedSeatIds].reverse(),
      idempotencyKey,
    );

    expect(firstResponse).toEqual(retryResponse);
    expect(firstResponse.message).toBe("Seats held successfully");
    expect(firstResponse.normalizedHolds).toHaveLength(2);
    expect(
      new Set(firstResponse.normalizedHolds.map((hold) => hold.hold_group_id))
        .size,
    ).toBe(1);

    const statusResult = await pool.query(
      `SELECT status FROM event_seats
       WHERE id = ANY($1::bigint[])
       ORDER BY id`,
      [requestedSeatIds],
    );
    expect(statusResult.rows.map((row) => row.status)).toEqual([
      "HELD",
      "HELD",
    ]);
  });

  test("rejects reusing an idempotency key for a different seat set", async () => {
    const idempotencyKey = randomUUID();

    await createSeatHoldService(userId, eventId, [seatIds[0]], idempotencyKey);

    await expect(
      createSeatHoldService(userId, eventId, [seatIds[2]], idempotencyKey),
    ).rejects.toMatchObject({
      message: "Idempotency key reused with a different request",
      statusCode: 409,
    });
  });

  test("rejects duplicate seat IDs before opening a database transaction", async () => {
    await expect(
      createSeatHoldService(
        userId,
        eventId,
        [seatIds[0], seatIds[0]],
        randomUUID(),
      ),
    ).rejects.toMatchObject({
      message: "Duplicate seat IDs are not allowed",
      statusCode: 400,
    });
  });
  test("rolls back the entire multi-seat hold when one requested seat is unavailable", async () => {
    const [availableSeatId, bookedSeatId] = seatIds;

    // Arrange: Make one seat already booked.
    await pool.query(
      `UPDATE event_seats
     SET status = 'BOOKED'
     WHERE id = $1`,
      [bookedSeatId],
    );

    const idempotencyKey = randomUUID();

    // Act: Request both seats.
    await expect(
      createSeatHoldService(
        userId,
        eventId,
        [availableSeatId, bookedSeatId],
        idempotencyKey,
      ),
    ).rejects.toMatchObject({
      message: "One or more seats are already booked",
      statusCode: 409,
    });

    // Assert 1: Available seat must remain AVAILABLE.
    // Booked seat must remain BOOKED.
    const seatResult = await pool.query(
      `SELECT id, status
     FROM event_seats
     WHERE id = ANY($1::bigint[])
     ORDER BY id`,
      [[availableSeatId, bookedSeatId]],
    );

    expect(seatResult.rows.map((row) => row.status)).toEqual([
      "AVAILABLE",
      "BOOKED",
    ]);

    // Assert 2: No hold records should have been created.
    const holdResult = await pool.query(
      `SELECT COUNT(*)::int AS count
     FROM seat_holds
     WHERE event_seat_id = ANY($1::bigint[])`,
      [[availableSeatId, bookedSeatId]],
    );

    expect(holdResult.rows[0].count).toBe(0);

    // Assert 3: Idempotency request must also be rolled back.
    const idempotencyResult = await pool.query(
      `SELECT COUNT(*)::int AS count
     FROM idempotency_requests
     WHERE user_id = $1
       AND event_id = $2
       AND idempotency_key = $3`,
      [userId, eventId, idempotencyKey],
    );

    expect(idempotencyResult.rows[0].count).toBe(0);
  });

  test("allows only one user to hold the same seat concurrently", async () => {
    const seatId = seatIds[0];
    const idempotencyKeyA = randomUUID();
    const idempotencyKeyB = randomUUID();

    const results = await Promise.allSettled([
      createSeatHoldService(userId, eventId, [seatId], idempotencyKeyA),
      createSeatHoldService(secondUserId, eventId, [seatId], idempotencyKeyB),
    ]);

    const successfulRequests = results.filter(
      (result) => result.status === "fulfilled",
    );
    const failedRequests = results.filter(
      (result) => result.status === "rejected",
    );

    expect(successfulRequests).toHaveLength(1);
    expect(failedRequests).toHaveLength(1);
    expect(failedRequests[0].reason.statusCode).toBe(409);

    const seatResult = await pool.query(
      `SELECT status
     FROM event_seats
     WHERE id = $1`,
      [seatId],
    );
    expect(seatResult.rows[0].status).toBe("HELD");

    const holdResult = await pool.query(
      `SELECT COUNT(*)::int AS count
     FROM seat_holds
     WHERE event_seat_id = $1
       AND status = 'ACTIVE'
       AND expires_at > NOW()`,
      [seatId],
    );
    expect(holdResult.rows[0].count).toBe(1);
  });
  
  test("releases an expired seat hold so another user can hold the seat", async () => {
  const seatId = seatIds[0];

  const firstIdempotencyKey = randomUUID();
  const secondIdempotencyKey = randomUUID();

  // Step 1: User A creates a hold.
  await createSeatHoldService(
    userId,
    eventId,
    [seatId],
    firstIdempotencyKey
  );

  // Verify that the seat is HELD.
  let seatResult = await pool.query(
    `SELECT status
     FROM event_seats
     WHERE id = $1`,
    [seatId]
  );

  expect(seatResult.rows[0].status).toBe("HELD");

  // Step 2: Simulate the hold expiry.
  // We move expires_at into the past instead of waiting 15 minutes.
  await pool.query(
    `UPDATE seat_holds
     SET expires_at = NOW() - INTERVAL '1 minute'
     WHERE event_seat_id = $1
       AND status = 'ACTIVE'`,
    [seatId]
  );
 
  // Step 3: Run the actual expiry service.
  await expirationRelease();

  // Step 4: Verify that the hold is EXPIRED.
  const holdResult = await pool.query(
    `SELECT status
     FROM seat_holds
     WHERE event_seat_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [seatId]
  );

  expect(holdResult.rows[0].status).toBe("EXPIRED");

  // Step 5: Verify that the seat is AVAILABLE again.
  seatResult = await pool.query(
    `SELECT status
     FROM event_seats
     WHERE id = $1`,
    [seatId]
  );

  expect(seatResult.rows[0].status).toBe("AVAILABLE");

  // Step 6: User B attempts to hold the same seat.
  const secondResponse = await createSeatHoldService(
    secondUserId,
    eventId,
    [seatId],
    secondIdempotencyKey
  );

  expect(secondResponse.normalizedHolds).toHaveLength(1);

  // Step 7: Verify that the new hold is ACTIVE.
  const activeHoldResult = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM seat_holds
     WHERE event_seat_id = $1
       AND status = 'ACTIVE'
       AND expires_at > NOW()`,
    [seatId]
  );

  expect(activeHoldResult.rows[0].count).toBe(1);

  // Final seat status should be HELD again.
  seatResult = await pool.query(
    `SELECT status
     FROM event_seats
     WHERE id = $1`,
    [seatId]
  );

  expect(seatResult.rows[0].status).toBe("HELD");
});
});
