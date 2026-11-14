import pool from  "./config/db.js"
async function seedTestDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Safety check: never seed the production database.
    const dbResult = await client.query(
      "SELECT current_database() AS database"
    );

    if (dbResult.rows[0].database !== "ticketrush_test1") {
      throw new Error("Refusing to seed a non-test database");
    }

    // 1. Create organizer
    const organizerResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [
        "Test Organizer",
        "organizer@test.com",
        "integration-test-hash",
        "ORGANIZER",
      ]
    );

    const organizerId = organizerResult.rows[0].id;

    // 2. Create customers
    const customers = [];

    for (let i = 1; i <= 5; i++) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'USER')
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [
          `Test Customer ${i}`,
          `customer${i}@test.com`,
          "integration-test-hash",
        ]
      );

      customers.push(result.rows[0].id);
    }

    // 3. Create venue
    const venueResult = await client.query(
      `INSERT INTO venues (name, address, capacity, city)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name)
       DO UPDATE SET address = EXCLUDED.address
       RETURNING id`,
      [
        "TicketRush Test Arena",
        "Integration Test Address",
        50,
        "Coimbatore",
      ]
    );

    const venueId = venueResult.rows[0].id;

    // 4. Create event (avoid duplicate fixture events)
    let eventResult = await client.query(
      `SELECT id FROM events
       WHERE title = $1 AND venue_id = $2
       ORDER BY id LIMIT 1`,
      ["TicketRush Integration Test Event", venueId]
    );

    if (eventResult.rows.length === 0) {
      eventResult = await client.query(
        `INSERT INTO events (
          title,
          description,
          category,
          start_date,
          end_date,
          price,
          status,
          created_by,
          venue_id
        )
        VALUES (
          $1, $2, $3,
          NOW() + INTERVAL '7 days',
          NOW() + INTERVAL '7 days 3 hours',
          $4, $5, $6, $7
        )
        RETURNING id`,
        [
          "TicketRush Integration Test Event",
          "Event created for integration testing",
          "MUSIC",
          999.00,
          "published",
          organizerId,
          venueId,
        ]
      );
    }

    const eventId = eventResult.rows[0].id;

    // 5. Generate 50 physical seats (5 rows x 10 seats)
    await client.query(
      `INSERT INTO seats (
        venue_id, section, row_label, seat_number
      )
      SELECT
        $1, 'A', chr(64 + rows.row_num), seat_numbers.seat_num
      FROM generate_series(1, 5) AS rows(row_num)
      CROSS JOIN generate_series(1, 10) AS seat_numbers(seat_num)
      ON CONFLICT (venue_id, section, row_label, seat_number)
      DO NOTHING`,
      [venueId]
    );

    // 6. Create event-specific seats
    await client.query(
      `INSERT INTO event_seats (
        event_id, seat_id, price, status
      )
      SELECT $1, id, $2, 'AVAILABLE'
      FROM seats
      WHERE venue_id = $3
      ON CONFLICT (event_id, seat_id)
      DO NOTHING`,
      [eventId, 999.00, venueId]
    );

    await client.query("COMMIT");

    // 7. Print seeded fixture information
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM event_seats
       WHERE event_id = $1`,
      [eventId]
    );

    console.log("Test database seeded successfully!");
    console.log({
      database: "ticketrush_test",
      organizerId,
      customers,
      venueId,
      eventId,
      totalEventSeats: countResult.rows[0].total,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTestDatabase();
