import pool from  "../config/db.js"
import bcrypt from "bcryptjs"
import {createAccessToken,createRefreshToken} from "../utils/jwt.js"
import jwt from "jsonwebtoken"
import createError from "../utils/error.js"

export const loginService = async (email, password) => {
  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT id, name, email, password_hash
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  const userData = result.rows[0];

  if (!userData) {
    throw createError("Invalid email or password", 401);
  }

  const comparePass = await bcrypt.compare(
    password,
    userData.password_hash
  );

  if (!comparePass) {
    throw createError("Invalid email or password", 401);
  }

  const accessToken = createAccessToken(userData.id);
  const refreshToken = createRefreshToken(userData.id);

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    accessToken,
    refreshToken,
  };
};


export const registerService = async (name, email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (existingUser.rows.length > 0) {
    throw createError("User already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const createUser = await pool.query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name`,
    [normalizedEmail, name.trim(), hashedPassword]
  );

  return createUser.rows[0];
};
