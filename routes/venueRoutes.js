
import express from "express";

import {
  createVenue,
  getVenues,
  getVenueById,
  updateVenue,
  deleteVenue
} from "../controllers/venueController.js";

const router = express.Router();

// Create a venue
router.post("/", createVenue);

// Get all venues
router.get("/", getVenues);

// Get a single venue by ID
router.get("/:id", getVenueById);

// Update a venue
router.patch("/:id", updateVenue);

// Delete a venue
router.delete("/:id", deleteVenue);

export default router;
