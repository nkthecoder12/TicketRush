import pool from "../config/db.js";



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
    eventData.created_by
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
    ["published"]
  );

  const totalEvents = Number(countResult.rows[0].total);

  // 2. Calculate pagination
  const totalPages = Math.ceil(totalEvents / limit);
  const skip = limit * (page - 1);

  const pagination = {
    currentPage: page,
    limit,
    totalEvents,
    totalPages
  };

  // 3. Validate the sort column
  const allowedSortColumns = [
    "start_date",
    "end_date",
    "price",
    "title"
  ];

  const safeSort = allowedSortColumns.includes(sort)
    ? sort
    : "start_date";

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
    ["published", limit, skip]
  );

  return {
    results: result.rows,
    pagination
  };
};

export const getEventsByIdService=async (eventId) => {
    
  

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

  const result=await pool.query(query,[eventId]  )

   if (result.rowCount === 0) {
    throw new Error("Event not found");
  }
   const data=result.rows[0];

  return data;



}

export const updateEventsService = async (eventData, eventId) => {
  const {
    title,
    description,
    category,
    venue_id,
    start_date,
    end_date,
    price,
    status
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
    eventId
  ];

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    throw new Error("Event not found");
  }

  return result.rows[0];
};


export const getSeatMapService=async (eventId) => {
  
  const eventDate=await pool.query(`select * from events where id=$1`,[eventId]);

  if(eventDate.rows[0]==0)throw new Error("No events");

  
 


}