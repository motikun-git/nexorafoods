const ApiError = require("../utils/ApiError");

/*
 * CSRF protection for cookie-based login.
 * Every request that changes something (POST/PATCH/PUT/DELETE) must send
 * the header "X-Requested-With: fetch". Another website cannot add this
 * header to a request to our API without CORS permission, so a malicious
 * page cannot act with the visitor's cookies.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requireAjaxHeader(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get("X-Requested-With") !== "fetch") {
    return next(new ApiError(403, "Missing security header"));
  }
  next();
}

module.exports = { requireAjaxHeader };
