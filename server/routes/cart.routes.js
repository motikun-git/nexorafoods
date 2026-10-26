const express = require("express");
const env = require("../config/env");
const cart = require("../services/cart.service");

const router = express.Router();
const COOKIE_NAME = "cart_token";

// httpOnly: JavaScript in the browser cannot read the token.
// In production the frontend and API may be on different domains, which
// requires SameSite=None + Secure (HTTPS).
const cookieOptions = {
  httpOnly: true,
  sameSite: env.isProduction ? "none" : "lax",
  secure: env.isProduction,
  maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days
  path: "/",
};

const tokenOf = (req) => req.cookies?.[COOKIE_NAME];

// GET /api/cart
router.get("/", async (req, res) => {
  res.json({ success: true, data: await cart.getCartView(tokenOf(req)) });
});

// POST /api/cart/items   { productId, quantity }
router.post("/items", async (req, res) => {
  const { token, view } = await cart.addItem(tokenOf(req), req.body?.productId, req.body?.quantity ?? 1);
  if (token !== tokenOf(req)) res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(201).json({ success: true, data: view });
});

// PATCH /api/cart/items/:productId   { quantity }   (0 removes the item)
router.patch("/items/:productId", async (req, res) => {
  const view = await cart.setQuantity(tokenOf(req), req.params.productId, req.body?.quantity);
  res.json({ success: true, data: view });
});

// DELETE /api/cart/items/:productId
router.delete("/items/:productId", async (req, res) => {
  res.json({ success: true, data: await cart.removeItem(tokenOf(req), req.params.productId) });
});

// DELETE /api/cart
router.delete("/", async (req, res) => {
  res.json({ success: true, data: await cart.clearCart(tokenOf(req)) });
});

module.exports = router;
