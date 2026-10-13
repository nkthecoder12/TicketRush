import {createEvent,getAllEvents} from "../controllers/eventController.js"
import express from "express"
import {authenticateUser} from "../middleware/authMiddleware.js"

const router=express.Router();

router.post("/createEvent",authenticateUser,createEvent);
router.get("/getAllEvents",getAllEvents)

export default router
