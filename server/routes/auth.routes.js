const express = require("express");
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const auth = require("../services/auth.service");
const cartService = require("../services/cart.service");
const { AUTH_COOKIE, authCookieOptions, requireAuth } = require("../middleware/auth.middleware");
const { CART_COOKIE, cartCookieOptions } = require("./cart.routes");

const router = express.Router();

// Slows down password guessing: limited attempts per IP per 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
});

// Log the user in: set the login cookie and move the guest cart into
// the account (so nothing added before logging in is lost).
async function startSession(req, res, user) {
  res.cookie(AUTH_COOKIE, auth.createToken(user), authCookieOptions);
  const cartToken = await cartService.attachGuestCartToUser(req.cookies?.[CART_COOKIE], user._id);
  if (cartToken) res.cookie(CART_COOKIE, cartToken, cartCookieOptions);
}

// POST /api/auth/register  { name, email, phone, password }
router.post("/register", authLimiter, async (req, res) => {
  const user = await auth.register(req.body);
  await startSession(req, res, user);
  res.status(201).json({ success: true, data: auth.publicUser(user) });
});

// POST /api/auth/login  { identifier (email or mobile), password }
router.post("/login", authLimiter, async (req, res) => {
  const user = await auth.login(req.body);
  await startSession(req, res, user);
  res.json({ success: true, data: auth.publicUser(user) });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const { maxAge: _a, ...authClear } = authCookieOptions;
  const { maxAge: _c, ...cartClear } = cartCookieOptions;
  res.clearCookie(AUTH_COOKIE, authClear);
  res.clearCookie(CART_COOKIE, cartClear); // the cart stays saved in the account
  res.json({ success: true, data: null });
});

// GET /api/auth/me  -> the logged-in user, or null for guests
router.get("/me", (req, res) => {
  res.json({ success: true, data: req.user ? auth.publicUser(req.user) : null });
});

// GET /api/auth/check  -> 401 for guests (used by protected pages)
router.get("/check", requireAuth, (req, res) => {
  res.json({ success: true, data: auth.publicUser(req.user) });
});

module.exports = router;
