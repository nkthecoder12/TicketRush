import {createEvent,getAllEvents,getEventById,updateEvent} from "../controllers/eventController.js"
import express from "express"
import {authenticateUser} from "../middleware/authMiddleware.js"

const router=express.Router();

router.post("/createEvent",authenticateUser,createEvent);
router.get("/getAllEvents",getAllEvents)
router.get("/getEventById/:id", getEventById);
router.patch("/updateEvent/:id",  updateEvent);

export default router
