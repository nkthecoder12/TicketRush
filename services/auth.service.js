import pool from  "../config/db.js"
import bcrypt from "bcryptjs"
import {createAccessToken,createRefreshToken} from "../utils/jwt.js"
export const loginService =async (email,password) => {
   
    const result=await pool.query(
        "select id,name,email,password_hash from users where email=$1",
        [email.trim().toLowerCase()]
    ) 

    if(!result){
        const error =new Error("Invalid email or password")
        error.statusCode=401;
        throw error
    }
    
    const userData=result.rows[0];

    const password_hash=userData.password_hash;

    const comparePass= await bcrypt.compare(password,password_hash);

    if(!comparePass){
         const error =new Error("Invalid email or password")
        error.statusCode=401;
        throw error
    }

    const accessToken=createAccessToken(userData.id);
    const refreshToken=createRefreshToken(userData.id);


    const data={
        id:userData.id,
        name:userData.name,
        email:userData.email,
        accessToken:accessToken,
        refreshToken:refreshToken
    }

  return data;


   




}