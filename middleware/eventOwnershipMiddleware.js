
import createError from "../utils/error.js";
import pool from "../config/db.js";

export const checkEventOwnership = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    // Admin can manage any event
    if (role === "admin") {
      return next();
    }

    // Find the event owner
    const result = await pool.query(
      `SELECT created_by
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    // Event does not exist
    if (result.rows.length === 0) {
      return next(createError("Event not found", 404));
    }

    const eventOwnerId = result.rows[0].created_by;

    // Check ownership
    if (String(eventOwnerId) !== String(userId)) {
      return next(createError("Forbidden", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
