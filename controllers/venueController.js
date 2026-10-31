
import { createVenueService,getVenuesService, updateVenueService,
  deleteVenuesService ,getVenuesByIdService} from "../services/venue.service.js";

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
export const getVenueById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid venue id" });
    }

    const venue = await getVenuesByIdService(id);

    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }

    return res.status(200).json({ success: true, data: venue });
  } catch (error) {
    console.error("Get venue error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch venue" });
  }
};

// PATCH /api/venues/:id
export const updateVenue = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await updateVenueService(req.body, id);

    return res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      data: venue
    });
  } catch (error) {
    console.error("Update venue error:", error);

    if (error.message === "Venue not found") {
      return res.status(404).json({
        success: false,
        message: "Venue not found"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update venue"
    });
  }
};

// DELETE /api/venues/:id
export const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await deleteVenuesService(id);

    return res.status(200).json({
      success: true,
      message: "Venue deleted successfully",
      data: venue
    });
  } catch (error) {
    console.error("Delete venue error:", error);

    if (error.message === "Venue not found") {
      return res.status(404).json({
        success: false,
        message: "Venue not found"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete venue"
    });
  }
};