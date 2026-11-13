import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { HOLD_STATUS, SEAT_STATUS } from "../constants/status.js";
import createError from "../utils/error.js";

export const createEventService = async (eventData) => {
  const query = `
    INSERT INTO events (
      title,
      description,
      category,
      venue_id,
      start_date,
      end_date,
      price,
      total_tickets,
      available_tickets,
      status,
      created_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11
    )
    RETURNING *;
  `;

  const values = [
    eventData.title,
    eventData.description,
    eventData.category,
    eventData.venue_id,
    eventData.start_date,
    eventData.end_date,
    eventData.price,
    eventData.total_tickets,
    eventData.available_tickets,
    eventData.status,
    eventData.created_by,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const getAllEventsService = async (page, limit, sort) => {
  // 1. Count all published events that have available tickets
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM events
     WHERE available_tickets > 0
       AND status = $1`,
    ["published"],
  );

  const totalEvents = Number(countResult.rows[0].total);

  // 2. Calculate pagination
  const totalPages = Math.ceil(totalEvents / limit);
  const skip = limit * (page - 1);

  const pagination = {
    currentPage: page,
    limit,
    totalEvents,
    totalPages,
  };

  // 3. Validate the sort column
  const allowedSortColumns = ["start_date", "end_date", "price", "title"];

  const safeSort = allowedSortColumns.includes(sort) ? sort : "start_date";

  // 4. Validate the sort direction
  const order = "ASC";
  const safeOrder = order === "DESC" ? "DESC" : "ASC";

  // 5. Fetch events
  const result = await pool.query(
    `SELECT
  id,
  title,
  description,
  category,
  venue_id,
  start_date,
  end_date,
  price,
  available_tickets
FROM events
     WHERE available_tickets > 0
       AND status = $1
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $2 OFFSET $3`,
    ["published", limit, skip],
  );

  return {
    results: result.rows,
    pagination,
  };
};

export const getEventsByIdService = async (eventId) => {
  const query = `
    SELECT
      id,
      title,
      description,
      category,
      venue_id,
      start_date,
      end_date,
      price,
      total_tickets,
      available_tickets,
      status
    FROM events
    WHERE id = $1
  `;

  const result = await pool.query(query, [eventId]);

  if (result.rowCount === 0) {
    throw createError("Event not found", 404);
  }
  
  const data = result.rows[0];

  return data;
};

export const updateEventsService = async (eventData, eventId) => {
  const {
    title,
    description,
    category,
    venue_id,
    start_date,
    end_date,
    price,
    status,
  } = eventData;

  const query = `
    UPDATE events
    SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      venue_id = COALESCE($4, venue_id),
      start_date = COALESCE($5, start_date),
      end_date = COALESCE($6, end_date),
      price = COALESCE($7, price),
      status = COALESCE($8, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *;
  `;

  const values = [
    title ?? null,
    description ?? null,
    category ?? null,
    venue_id ?? null,
    start_date ?? null,
    end_date ?? null,
    price ?? null,
    status ?? null,
    eventId,
  ];

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    throw createError("Event not found", 404);
  }

  return result.rows[0];
};

export const getSeatMapService = async (eventId) => {
  const eventData = await pool.query(`SELECT id FROM events WHERE id = $1`, [
    eventId,
  ]);

  if (eventData.rows.length === 0) {
    throw createError("Event not found", 404);
  }

const result = await pool.query(
  `SELECT es.id AS event_seat_id,
          es.status,
          s.section,
          s.row_label,
          s.seat_number
   FROM event_seats es
   JOIN seats s ON s.id = es.seat_id
   WHERE es.event_id = $1
   ORDER BY s.section, s.row_label, s.seat_number`,
  
  [eventId]
);

  return result.rows;
};





export const createSeatHoldService = async (
  userId,
  eventId,
  eventSeatIds,
  idempotencyKey,
) => {

  // 1. Validate input
  if (!Array.isArray(eventSeatIds) || eventSeatIds.length === 0) {
    throw createError("Select at least one seat");
  }


  if (new Set(eventSeatIds.map(String)).size !== eventSeatIds.length) {
    throw createError("Duplicate seat IDs are not allowed");
  }

  // Normalize the seat IDs so the same set produces the same hash.
  const normalizedSeatIds = eventSeatIds.map(String).sort();

  const requestHash = createHash("sha256")
    .update(JSON.stringify({ eventSeatIds: normalizedSeatIds }))
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 2. Claim the idempotency key atomically
    const insertRequest = await client.query(
      `INSERT INTO idempotency_requests
        (user_id, event_id, idempotency_key, request_body_hash, status)
       VALUES ($1, $2, $3, $4, 'processing')
       ON CONFLICT (user_id, event_id, idempotency_key)
       DO NOTHING
       RETURNING *`,
      [userId, eventId, idempotencyKey, requestHash],
    );

    // 3. If the key already exists, handle the retry
    if (insertRequest.rows.length === 0) {
      const existingResult = await client.query(
        `SELECT *
         FROM idempotency_requests
         WHERE user_id = $1
           AND event_id = $2
           AND idempotency_key = $3
         FOR UPDATE`,
        [userId, eventId, idempotencyKey],
      );

      const existing = existingResult.rows[0];

      if (!existing) {
        throw createError("Unable to resolve idempotency request", 409);
      }

      if (existing.request_body_hash !== requestHash) {
        throw createError(
          "Idempotency key reused with a different request",
          409,
        );
      }

      if (existing.status === "completed") {
        await client.query("COMMIT");
        return existing.response_body;
      }


      throw createError("Request is still processing; retry shortly", 409);
    }
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const oldSeatsResult = await client.query(
      `SELECT id, event_id, status
       FROM event_seats
       WHERE event_id = $1
         AND id = ANY($2::bigint[])
       ORDER BY id
       FOR UPDATE`,
      [eventId, normalizedSeatIds]
    );


    if (oldSeatsResult.rows.length !== normalizedSeatIds.length) {
      throw createError("One or more seats do not belong to this event", 404);
    }

       await client.query(
      `UPDATE seat_holds
       SET status = $1
       WHERE event_seat_id = ANY($2::bigint[])
         AND status = $3
         AND expires_at <= NOW()`,
      [HOLD_STATUS.EXPIRED, normalizedSeatIds, HOLD_STATUS.ACTIVE],
    );

     await client.query(
      `UPDATE event_seats es
      SET status=$1
      WHERE es.id=ANY($2 :: bigint[]) AND es.event_id=$3 AND es.status=$4  AND NOT EXISTS(
      SELECT 1 FROM seat_holds sh WHERE sh.event_seat_id=es.id AND sh.status=$5 AND sh.expires_at > NOW()
      
      )`,

      [SEAT_STATUS.AVAILABLE,normalizedSeatIds,eventId,SEAT_STATUS.HELD,HOLD_STATUS.ACTIVE]
     )

  
   const seatsResult = await client.query(
      `SELECT id, event_id, status
       FROM event_seats
       WHERE event_id = $1
         AND id = ANY($2::bigint[])
       ORDER BY id
       `,
      [eventId, normalizedSeatIds]
    );   
 
    const unavailableSeat = seatsResult.rows.find(
      (seat) => seat.status !== SEAT_STATUS.AVAILABLE,
    );

    if (unavailableSeat) {
      throw createError("One or more seats are already booked", 409);
    }

const updateResult = await client.query(
  `UPDATE event_seats
   SET status = $1
   WHERE event_id = $2
     AND id = ANY($3::bigint[])
     AND status = $4`,
  [
    SEAT_STATUS.HELD,
    eventId,
    normalizedSeatIds,
    SEAT_STATUS.AVAILABLE
  ],
);

if (updateResult.rowCount !== normalizedSeatIds.length) {
  throw createError("Unable to hold all seats", 409);
}

    // 6. Create all holds with a shared 15-minute expiration
   
    const holds = [];

       const holdGroupId = randomUUID(); 
 const expiryResult = await client.query(
  `SELECT NOW() + INTERVAL '15 minutes' AS expires_at`
);

const expiresAt = expiryResult.rows[0].expires_at;
    for (const eventSeatId of normalizedSeatIds) {
      const holdResult = await client.query(
        `INSERT INTO seat_holds
          (user_id, event_seat_id, status, hold_group_id, expires_at)
         VALUES ($1, $2, $3,$4,$5)
         RETURNING *`,
        [userId, eventSeatId, HOLD_STATUS.ACTIVE,holdGroupId,expiresAt ]
      );

      holds.push(holdResult.rows[0]);
    }
   
     const normalizedHolds=holds.map((holds)=>({
      ...holds,
      expires_at:new Date(holds.expires_at).toISOString()
     }))


    // 7. Save the response for future idempotent retries
    const responseBody = {
      message: "Seats held successfully",
      expiresAt: expiresAt.toISOString(),
      normalizedHolds,
    };

    await client.query(
      `UPDATE idempotency_requests
       SET status = 'completed',
           response_body = $1::jsonb
       WHERE user_id = $2
         AND event_id = $3
         AND idempotency_key = $4`,
      [JSON.stringify(responseBody), userId, eventId, idempotencyKey],
    );

    // 8. Commit everything together
    await client.query("COMMIT");

    return responseBody;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw createError(
        "One or more seats are already held by another request",
        409,
      );
    }

    throw error;
  } finally {
    client.release();
  }
};



export const generateSeats=async (data,eventId) => {
  
  const query=`select venue_id,status from events where id=$1`;

  const result=await pool.query(query,[eventId]);

  if(result.rows.length===0){
    throw createError("event not found",404);
  }
  if(result.rows[0].status!=='DRAFT'){
    throw createError("Event already Published",409)
  }

  const venue_id=result.rows[0].venue_id;

  const existingSectionData=await pool.query(`
    select distinct section from seats where venue_id=$1`,[venue_id]);

    const sections=existingSectionData.rows.map(
      (row)=>row.section
    )

     const sectionSet=new Set(sections)
   for(const sectionData of data){
    if(!sectionSet.has(sectionData.section)){
      throw createError("Wrong Sections",400);
    }


    
   }

   const values=[]
   const params=[]

   data.forEach((section,index)=>{
    const par1=index*2+4;
    const par2=index*2+5;

   values.push(`($${par1}, $${par2})`);
   params.push(section.section,section.price)



   })


   


   const insertQuery=`
   insert into event_seats(event_id,seat_id,price,status)
   select $1,s.id,ps.price,$2
   from seats s 
   join(values ${values.join(", ")}) as ps(section,price)  on ps.section=s.section
   where venue_id=$3
   returning *
   `
   
   const generateSeatQuery=await pool.query(insertQuery,[eventId,'available',venue_id,...params])

    

    
    return generateSeatQuery.rows;


  




}













