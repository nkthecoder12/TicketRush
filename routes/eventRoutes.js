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

router.get("/:eventId/seats",getSeatMap);

export default router
