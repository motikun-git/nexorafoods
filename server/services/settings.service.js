const StoreSettings = require("../models/StoreSettings");
const defaults = require("../config/store.defaults");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Saved values override defaults, key by key (nested objects merged too).
function deepMerge(base, override) {
  if (!isPlainObject(override)) return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return result;
}

// Public settings used by the storefront (header, footer, colors, hero...).
async function getSettings() {
  const saved = await StoreSettings.findOne({ key: "store" }).lean();
  return deepMerge(defaults, saved?.values);
}

module.exports = { getSettings, deepMerge };
