
import jwt from "jsonwebtoken";
import "dotenv/config"; 
import createError from "../utils/error.js";

export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError("Authentication token required", 401);
    }

    const token = authHeader.split(" ")[1];

    const userData = jwt.verify(
      token,
      process.env.TOKEN_SECRET
    );

    req.user = userData.sub;

    // Allow the request to continue
    next();

  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }

    return next(createError("Invalid or expired token", 401));
  }
};
