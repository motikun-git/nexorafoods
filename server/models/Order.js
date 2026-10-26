const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * An order keeps a SNAPSHOT of what was bought (name, prices, quantity),
 * so it never changes when an admin later edits or deletes a product.
 */
const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    unit: { type: String, default: "" },
    image: { type: String, default: null },
    price: { type: Number, required: true, min: 0 }, // regular price at the time
    finalPrice: { type: Number, required: true, min: 0 }, // price actually charged
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, "An order needs at least one item"] },

    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },

    shipping: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      area: { type: String, enum: ["inside_dhaka", "outside_dhaka"], required: true },
      city: { type: String, required: true },
      addressLine: { type: String, required: true },
      note: { type: String, default: "" },
    },

    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },

    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],

    // Sent by the checkout page; the same key twice = the same order
    // (protects against double clicks and network retries).
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
