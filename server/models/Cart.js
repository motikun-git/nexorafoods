const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * Server-side cart. Guests are identified by a random token stored in an
 * httpOnly cookie (the browser's JavaScript cannot read it). Prices are
 * NOT stored here - they are always read from the product at the moment
 * the cart is shown, so nobody can change a price from the browser.
 */
const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: [Number.isInteger, "Quantity must be a whole number"],
    },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null }, // set after login (later step)
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
