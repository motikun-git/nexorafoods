const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * Customer and admin accounts.
 * - passwordHash is never sent to the browser (select: false).
 * - role can only be "admin" when set by the create-admin script,
 *   never through the public register API.
 */
const addressSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 30, default: "Home" },
    recipientName: { type: String, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 20 },
    area: { type: String, enum: ["inside_dhaka", "outside_dhaka"], default: "inside_dhaka" },
    city: { type: String, trim: true, maxlength: 60 },
    addressLine: { type: String, trim: true, maxlength: 250 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name is too short"],
      maxlength: [60, "Name is too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    // Stored as 01XXXXXXXXX (Bangladesh mobile format)
    phone: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [/^01[3-9]\d{8}$/, "Invalid mobile number"],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
