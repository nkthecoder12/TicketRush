import jwt from "jsonwebtoken";
const createAccessToken = (userId) => {
    return jwt.sign(
        { sub: userId },
        process.env.TOKEN_SECRET,
        { expiresIn: "15m" }
    );
};

const createRefreshToken = (userId) => {
    return jwt.sign(
        { sub: userId },
        process.env.TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};

const verifyToken = (token) => {
    return jwt.verify(
        token,
        process.env.TOKEN_SECRET
    );
};

export {
    createAccessToken,
    createRefreshToken,
    verifyToken
};