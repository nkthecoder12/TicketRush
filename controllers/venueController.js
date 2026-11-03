
import { createVenueService,getVenuesService, updateVenueService,
  deleteVenuesService ,getVenuesByIdService} from "../services/venue.service.js";
import createError from "../utils/error.js";

export const createVenue = async (req, res, next) => {

  try {
    const { name, address, city, capacity } = req.body;

    // Validate required fields
    if (!name || !address || !city || capacity == null) {
      throw createError("Name, address, city and capacity are required", 400);
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
    return next(error);
  }
};




export const getVenues = async (req, res, next) => {
  try {
    const venues = await getVenuesService();

    return res.status(200).json({
      success: true,
      count: venues.length,
      data: venues
    });
  } catch (error) {
    return next(error);
  }
};
export const getVenueById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("Invalid venue id", 400);
    }

    const venue = await getVenuesByIdService(id);

    return res.status(200).json({ success: true, data: venue });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/venues/:id
export const updateVenue = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("Invalid venue id", 400);
    }

    const venue = await updateVenueService(req.body, id);

    return res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      data: venue
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/venues/:id
export const deleteVenue = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError("Invalid venue id", 400);
    }

    const venue = await deleteVenuesService(id);

    return res.status(200).json({
      success: true,
      message: "Venue deleted successfully",
      data: venue
    });
  } catch (error) {
    return next(error);
  }
};