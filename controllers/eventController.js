import {createEventService,getAllEventsService} from "../services/events.service.js"
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
  status: "draft", // Add this
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
