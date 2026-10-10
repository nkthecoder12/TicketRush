
import jwt from "jsonwebtoken";
import "dotenv/config"; 

export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", Boolean(token));


    const userData = jwt.verify(
      token,
      process.env.TOKEN_SECRET
    );

    req.user = userData.sub;

    // Allow the request to continue
    next();

  } catch (error) {
      console.error("JWT Error:", error.name, error.message);
    return res.status(401).json({
        
      message: "Invalid or expired token",
    });
  }
};
