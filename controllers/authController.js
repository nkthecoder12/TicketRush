
import { loginService,registerService } from "../services/auth.service.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await loginService(email, password);

    // Store refresh token in an HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};


export const register=async (req,res) => {
  try {
    
    const {name,email,password}=req.body;

    if(!name || !email || ! password){
      return res.status(401).json({message:"invalid credentials"});
    }

    const result=await registerService(name,email,password);

    return res.status(201).json({
      id:result.id,
      name:result.name,
      email:result.email,

    })
  

  } catch (error) {
    next(error)
  }
}
