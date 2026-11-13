import pool from "../config/db.js";

export const expirationRelease = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find a batch of expired holds
    const expiredResult = await client.query(
      `SELECT id, event_seat_id
       FROM seat_holds
       WHERE status = 'ACTIVE'
         AND expires_at < NOW()
       ORDER BY expires_at
       LIMIT 100`
    );

    if (expiredResult.rows.length === 0) {
      await client.query("COMMIT");
      return {
        success: true,
        expiredCount: 0,
        message: "No expired holds found",
      };
    }

    // 2. Extract hold IDs and event seat IDs
    const holdIds = expiredResult.rows.map((row) => row.id);

    const eventSeatIds = [
      ...new Set(
        expiredResult.rows.map((row) => String(row.event_seat_id))
      ),
    ];

    // 3. Lock event seats in a consistent order
    await client.query(
      `SELECT id
       FROM event_seats
       WHERE id = ANY($1::BIGINT[])
       ORDER BY id
       FOR UPDATE`,
      [eventSeatIds]
    );

    // 4. Expire only holds that are still ACTIVE and expired
    const updateHolds = await client.query(
      `UPDATE seat_holds
       SET status = 'EXPIRED'
       WHERE id = ANY($1::BIGINT[])
         AND status = 'ACTIVE'
         AND expires_at < NOW()
       RETURNING id, event_seat_id`,
      [holdIds]
    );

    // 5. Extract seats belonging to holds actually expired
    const releasedSeatIds = [
      ...new Set(
        updateHolds.rows.map((row) => String(row.event_seat_id))
      ),
    ];

    // 6. Release only seats that are currently HELD
    if (releasedSeatIds.length > 0) {
      await client.query(
        `UPDATE event_seats
         SET status = 'AVAILABLE'
         WHERE id = ANY($1::BIGINT[])
           AND status = 'HELD'`,
        [releasedSeatIds]
      );
    }

    // 7. Commit all changes
    await client.query("COMMIT");

    return {
      success: true,
      expiredCount: updateHolds.rowCount,
      releasedSeatCount: releasedSeatIds.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Expiration release failed:", error);

    throw error;
  } finally {
    client.release();
  }
};