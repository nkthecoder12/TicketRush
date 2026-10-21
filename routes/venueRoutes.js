import express from "express"
import {createVenue,getVenues} from "../controllers/venueController.js"

const router=express.Router();

router.post("/createVenue",createVenue)

router.get("/getVenues",getVenues)



export default router;