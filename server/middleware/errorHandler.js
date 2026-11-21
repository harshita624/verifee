module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  if (err.name === "CastError") { status = 400; message = "Invalid ID"; }

  if (process.env.NODE_ENV === "development") console.error("[ERROR]", err);
  if (process.env.NODE_ENV === "production" && status >= 500) message = "Internal server error";
  if (err.code === "CORS_ORIGIN_DENIED") message = "Origin not allowed";

  res.status(status).json({
    success: false,
    message,
    ...(err.paypal && {
      paypalIssue: err.paypal.issue || err.paypal.name || "PAYPAL_REQUEST_FAILED",
      paypalDebugId: err.paypal.debugId || undefined,
    }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
