/*
 * Contact form.
 *  - validated on the server, with length limits
 *  - max 5 messages per IP address per hour (spam protection)
 *  - "website" is a hidden trap field: people never fill it, simple bots do.
 *    Bot messages get a normal-looking reply but are not saved.
 *  - success is only reported after the message is really saved
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const ContactMessage = require("../models/ContactMessage");
const ApiError = require("../utils/ApiError");
const { normalizePhone } = require("../services/auth.service");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.CONTACT_RATE_LIMIT) || 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many messages. Please try again later or call us." },
});

function field(body, key, label, { min = 0, max }) {
  const value = body?.[key];
  if (value !== undefined && value !== null && typeof value !== "string") throw new ApiError(400, `${label} must be text`);
  const trimmed = (value || "").trim();
  if (trimmed.length < min) throw new ApiError(400, min <= 1 ? `${label} is required` : `${label} is too short`);
  if (trimmed.length > max) throw new ApiError(400, `${label} is too long`);
  return trimmed;
}

// POST /api/contact  { name, phone, email, subject, message, website(trap) }
router.post("/", limiter, async (req, res) => {
  if (req.body?.website) return res.status(201).json({ success: true, data: { received: true } });

  const name = field(req.body, "name", "Name", { min: 2, max: 60 });
  const phoneInput = field(req.body, "phone", "Phone", { max: 20 });
  const email = field(req.body, "email", "Email", { max: 120 }).toLowerCase();
  const subject = field(req.body, "subject", "Subject", { max: 120 });
  const message = field(req.body, "message", "Message", { min: 10, max: 2000 });

  const phone = phoneInput ? normalizePhone(phoneInput) : "";
  if (phone && !/^01[3-9]\d{8}$/.test(phone)) throw new ApiError(400, "Enter a valid mobile number (01XXXXXXXXX)");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Enter a valid email address");
  if (!phone && !email) throw new ApiError(400, "Give a phone number or an email so we can reply");

  await ContactMessage.create({ name, phone, email, subject, message, user: req.user?._id || null });
  res.status(201).json({ success: true, data: { received: true } });
});

module.exports = router;
