const env = require("../config/env");

// Runs when no route matched the request.
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Runs whenever any route throws an error.
// Express 5 automatically sends errors from async routes here.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  // Invalid MongoDB id, e.g. /api/products/abc
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid id";
  }

  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Unique index violated (e.g. duplicate slug or email)
  if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(", ")}`;
  }

  // Body was not valid JSON
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON body";
  }

  if (statusCode >= 500) {
    console.error(err);
    // Never show internal error details to users in production.
    if (env.isProduction) message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}

module.exports = { notFound, errorHandler };
