import {createEventService,getAllEventsService,getEventsByIdService,updateEventsService} from "../services/events.service.js"
import { validateCreateEvent } from "../validations/event.validation.js";


export const createEvent=async (req,res,next) => {
     try {
   const validationError = validateCreateEvent(req.body);

if (validationError) {
  return res.status(400).json({
    success: false,
    message: validationError
  });
}
 

     const eventData = {
  title: req.body.title.trim(),
  description: req.body.description ?? null,
  category: req.body.category.trim(),
  venue: req.body.venue.trim(),
  start_date: req.body.start_date,
  end_date: req.body.end_date,
  price: req.body.price,
  total_tickets: req.body.total_tickets,
  available_tickets: req.body.total_tickets,
  status: "draft",
  created_by: req.user
};
    const result=await createEventService(eventData);

    return res.status(201).json({
        message:"Event Created SuccessFully",
       data:result
    })


     } catch (error) {
       return res.status(400).json({
        message:error.message,
       
    })
     }
   




}


export const getAllEvents = async (req, res) => {
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
    return res.status(500).json({
      message: error.message
    });
  }
};

export const getEventById = async (req, res) => {
try {
const eventId  = req.params.id;

const event = await getEventsByIdService(eventId);

return res.status(200).json({
  success: true,
  data: event,
});

} catch (error) {
if (error.message === "Event not found") {
return res.status(404).json({
success: false,
message: error.message,
});
}

return res.status(500).json({
  success: false,
  message: "Failed to fetch event",
});

}
};

export const updateEvent = async (req, res) => {
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
if (error.message === "Event not found") {
return res.status(404).json({
success: false,
message: error.message,
});
}

console.error("Update event error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to update event",
});

}
};