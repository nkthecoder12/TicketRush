import pool from "../config/db.js";

export const createEventService=async (eventData) => {
      
  const query = `
    INSERT INTO events (
        title,
        description,
        category,
        venue,
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
    eventData.venue,
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




}


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
    `SELECT title, description, category, venue,
            start_date, end_date, price
     FROM events
     WHERE available_tickets > 0
       AND status = $1
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $2 OFFSET $3`,
    ["draft", limit, skip]
  );

  return {
    results: result.rows,
    pagination
  };
};
