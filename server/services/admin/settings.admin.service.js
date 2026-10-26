/*
 * Store Settings editing (white-label). Only the fields listed here can be
 * changed, and each one is validated.
 */
const StoreSettings = require("../../models/StoreSettings");
const ApiError = require("../../utils/ApiError");
const { getSettings, deepMerge } = require("../settings.service");

const HEX = /^#[0-9a-f]{6}$/i;
const URL_OR_PATH = /^(https:\/\/[^\s"'<>]+|\/[A-Za-z0-9/_.-]+)$/;

function text(value, label, max, { required = false } = {}) {
  if (typeof value !== "string") throw new ApiError(400, `${label} must be text`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ApiError(400, `${label} is required`);
  if (trimmed.length > max) throw new ApiError(400, `${label} is too long (max ${max})`);
  return trimmed;
}

function link(value, label) {
  const trimmed = text(value, label, 500);
  if (trimmed && !URL_OR_PATH.test(trimmed)) throw new ApiError(400, `${label} must start with https:// or /`);
  return trimmed;
}

function money(value, label, { nullable = false } = {}) {
  if (nullable && (value === null || value === "")) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) throw new ApiError(400, `${label} must be a number of 0 or more`);
  return Math.round(number);
}

// Each entry: [path, validator]
const FIELDS = [
  ["storeName", (v) => text(v, "Store name", 60, { required: true })],
  ["tagline", (v) => text(v, "Tagline", 120)],
  ["description", (v) => text(v, "Description", 300)],
  ["logo", (v) => link(v, "Logo")],
  ["favicon", (v) => link(v, "Favicon")],
  ["orderPrefix", (v) => {
    const prefix = text(v, "Order prefix", 6, { required: true }).toUpperCase();
    if (!/^[A-Z0-9]+$/.test(prefix)) throw new ApiError(400, "Order prefix may contain only letters and numbers");
    return prefix;
  }],
  ["colors.primary", (v) => {
    if (!HEX.test(v)) throw new ApiError(400, "Primary color must look like #35552B");
    return v;
  }],
  ["colors.accent", (v) => {
    if (!HEX.test(v)) throw new ApiError(400, "Accent color must look like #F28C38");
    return v;
  }],
  ["contact.phone", (v) => text(v, "Phone", 30)],
  ["contact.email", (v) => {
    const email = text(v, "Email", 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Email is invalid");
    return email;
  }],
  ["contact.address", (v) => text(v, "Address", 300)],
  ["contact.mapUrl", (v) => link(v, "Map link")],
  ["contact.website", (v) => link(v, "Website")],
  ["socials.facebook", (v) => link(v, "Facebook link")],
  ["socials.instagram", (v) => link(v, "Instagram link")],
  ["socials.tiktok", (v) => link(v, "TikTok link")],
  ["socials.youtube", (v) => link(v, "YouTube link")],
  ["delivery.insideDhaka", (v) => money(v, "Delivery inside Dhaka")],
  ["delivery.outsideDhaka", (v) => money(v, "Delivery outside Dhaka")],
  ["delivery.freeDeliveryAbove", (v) => money(v, "Free delivery above", { nullable: true })],
  ["payments.cashOnDelivery", (v) => {
    if (typeof v !== "boolean") throw new ApiError(400, "Cash on Delivery must be on or off");
    return v;
  }],
  ["hero.badge", (v) => text(v, "Hero badge", 60)],
  ["hero.title", (v) => text(v, "Hero title", 80)],
  ["hero.highlight", (v) => text(v, "Hero highlight", 80)],
  ["hero.subtitle", (v) => text(v, "Hero subtitle", 200)],
  ["hero.ctaLabel", (v) => text(v, "Button text", 30)],
];

function getPath(object, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  let target = object;
  for (const key of keys.slice(0, -1)) {
    target[key] = target[key] && typeof target[key] === "object" ? target[key] : {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

async function updateSettings(body) {
  if (!body || typeof body !== "object") throw new ApiError(400, "Invalid settings");
  const changes = {};
  for (const [path, validate] of FIELDS) {
    const value = getPath(body, path);
    if (value !== undefined) setPath(changes, path, validate(value));
  }
  if (Object.keys(changes).length === 0) throw new ApiError(400, "Nothing to update");

  const saved = await StoreSettings.findOne({ key: "store" });
  const merged = deepMerge(saved?.values || {}, changes);
  await StoreSettings.updateOne({ key: "store" }, { $set: { values: merged } }, { upsert: true });
  return getSettings();
}

module.exports = { updateSettings };
