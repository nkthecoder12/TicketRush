
import express from "express";
import authRouter from "../routes/authRoutes.js"

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "Health check success",
  });
});

// Auth routes
app.use("/api", authRouter);

export default app;
