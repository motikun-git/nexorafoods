const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * A single document (key: "store") holding the brand settings that the
 * admin can edit. Missing fields fall back to config/store.defaults.js.
 * Stored loosely (Mixed) because the service validates every field.
 */
const storeSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    values: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);
