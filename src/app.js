
import express from "express";
import authRouter from "../routes/authRoutes.js"
import eventRouter from "../routes/eventRoutes.js"
import venueRoutes from "../routes/venueRoutes.js"
import { authenticateUser } from "../middleware/authMiddleware.js";
import { errorMiddleware } from "../middleware/errorMiddleware.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../config/swagger.js";
import "dotenv/config";
import "../jobs/expirationRelease.js"; 

const app = express();


// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Health check success",
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.get("/me", authenticateUser, (req, res) => {
  return res.status(200).json({
    message: "Authenticated successfully",
    user: req.user,
  });
});
// Auth routes
app.use("/api", authRouter);


//Event routes

app.use("/api/events",eventRouter)

//venue routes

app.use("/api/venues", venueRoutes);

app.use(errorMiddleware);

export default app;
