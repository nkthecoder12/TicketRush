import {createEventService,getAllEventsService,getEventsByIdService,updateEventsService,getSeatMapService} from "../services/events.service.js"
import { validateCreateEvent } from "../validations/event.validation.js";
import createError from "../utils/error.js";


export const createEvent=async (req,res,next) => {
     try {
   const validationError = validateCreateEvent(req.body);

if (validationError) {
  throw createError(validationError, 400);
}
 const eventData = {
    title: req.body.title.trim(),
    description: req.body.description?.trim() ?? null,
    category: req.body.category.trim(),
    venue_id: req.body.venue_id,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    price: req.body.price,
    total_tickets: req.body.total_tickets,
    available_tickets: req.body.total_tickets,
    status: "draft",
    created_by: req.user.id
};
    const result=await createEventService(eventData);

    return res.status(201).json({
        message:"Event Created SuccessFully",
       data:result
    })


     } catch (error) {
       return next(error);
     }
   




}


export const getAllEvents = async (req, res, next) => {
  try {
    const pageNumber = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limitNumber = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const sortBy = req.query.sort || "start_date";

    const result = await getAllEventsService(
      pageNumber,
      limitNumber,
      sortBy
    );

    return res.status(200).json({
      message: "Events retrieved successfully",
      data: result.results,
      pagination: result.pagination
    });
  } catch (error) {
    return next(error);
  }
};

export const getEventById = async (req, res, next) => {
try {
const eventId  = req.params.id;

const event = await getEventsByIdService(eventId);

return res.status(200).json({
  success: true,
  data: event,
});

} catch (error) {
return next(error);
}
};

export const updateEvent = async (req, res, next) => {
try {
const eventId = req.params.id;
const eventData = req.body;

const updatedEvent = await updateEventsService(
  eventData,
  eventId
);

return res.status(200).json({
  success: true,
  message: "Event updated successfully",
  data: updatedEvent,
});

} catch (error) {
return next(error);
}
};

export const getSeatMap = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const seatData = await getSeatMapService(eventId);

    return res.status(200).json({
      success: true,
      message: "Seat map fetched successfully",
      data: seatData,
    });
  } catch (error) {
    return next(error);
  }
};