
import { createVenueService,getVenuesService } from "../services/venue.service.js";

export const createVenue = async (req, res) => {
  try {
    const { name, address, city, capacity } = req.body;

    // Validate required fields
    if (!name || !address || !city || capacity == null) {
      return res.status(400).json({
        success: false,
        message: "Name, address, city and capacity are required"
      });
    }

    // Call service
    const venue = await createVenueService({
      name,
      address,
      city,
      capacity
    });

    return res.status(201).json({
      success: true,
      message: "Venue created successfully",
      data: venue
    });

  } catch (error) {
    console.error("Create venue error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create venue"
    });
  }
};




export const getVenues = async (req, res) => {
  try {
    const venues = await getVenuesService();

    return res.status(200).json({
      success: true,
      count: venues.length,
      data: venues
    });
  } catch (error) {
    console.error("Get venues error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch venues"
    });
  }
};
