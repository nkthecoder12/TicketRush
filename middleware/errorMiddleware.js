export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const providedStatusCode = err?.statusCode;
  const statusCode =
    Number.isInteger(providedStatusCode) &&
    providedStatusCode >= 400 &&
    providedStatusCode <= 599
      ? providedStatusCode
      : 500;

  if (statusCode >= 500) {
    console.error({
      message: err?.message,
      stack: err?.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message:
      typeof err?.message === "string" && err.message
        ? err.message
        : "Internal server error",
  });
};