const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { verifyToken, findActiveUser, TOKEN_DAYS } = require("../services/auth.service");

const AUTH_COOKIE = "auth_token";

const authCookieOptions = {
  httpOnly: true,
  sameSite: env.isProduction ? "none" : "lax",
  secure: env.isProduction,
  maxAge: 1000 * 60 * 60 * 24 * TOKEN_DAYS,
  path: "/",
};

// Runs on every request: if a valid login cookie exists, req.user is set.
async function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next();

  const payload = verifyToken(token);
  const user = payload?.sub ? await findActiveUser(payload.sub) : null;
  if (user) req.user = user;
  else res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined });
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(new ApiError(401, "Please log in to continue"));
  next();
}

// Admin rights are checked on the SERVER - hiding buttons is not enough.
function requireAdmin(req, res, next) {
  if (!req.user) return next(new ApiError(401, "Please log in to continue"));
  if (req.user.role !== "admin") return next(new ApiError(403, "You do not have permission to do this"));
  next();
}

module.exports = { loadUser, requireAuth, requireAdmin, AUTH_COOKIE, authCookieOptions };
