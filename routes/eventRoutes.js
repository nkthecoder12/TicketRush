import {createEvent,getAllEvents,getEventById,updateEvent,getSeatMap} from "../controllers/eventController.js"
import express from "express"
import {authenticateUser} from "../middleware/authMiddleware.js"

const router=express.Router();

// Create an event
router.post("/", authenticateUser, createEvent);

// Get all events
router.get("/", getAllEvents);

// Get an event by ID
router.get("/:id", getEventById);

// Update an event
router.patch("/:id", authenticateUser, updateEvent);


/**
 * @swagger
 * /events/{eventId}/seats:
 *   get:
 *     summary: Get event seat map
 *     description: Retrieve seats associated with an event.
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Seat map retrieved successfully
 *       400:
 *         description: Invalid event ID
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get("/:eventId/seats", getSeatMap);

export default router
