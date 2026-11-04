
import createError from "../utils/error.js";

export const accessMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return next(createError("Forbidden", 403));
    }

    if (!allowedRoles.includes(role)) {
      return next(createError("Forbidden", 403));
    }

    next();
  };
};
