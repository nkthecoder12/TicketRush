
import express from "express";
import authRouter from "../routes/authRoutes.js"
import { authenticateUser } from "../middleware/authMiddleware.js";
import "dotenv/config"; 

const app = express();


// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Health check success",
  });
});



app.get("/me", authenticateUser, (req, res) => {
  return res.status(200).json({
    message: "Authenticated successfully",
    user: req.user,
  });
});
// Auth routes
app.use("/api", authRouter);

export default app;
