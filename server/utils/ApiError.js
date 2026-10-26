// A normal Error plus an HTTP status code.
// Usage in a controller:  throw new ApiError(404, "Product not found");
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details; // optional: e.g. list of validation errors
  }
}

module.exports = ApiError;
