const mongoose = require("mongoose");

// Messages sent from the Contact page. Read by admins in the admin panel.
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    subject: { type: String, trim: true, maxlength: 120, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["new", "read", "replied"], default: "new", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
