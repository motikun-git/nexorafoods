/*
 * ORDER RULES (customer side)
 *  - Only logged-in customers can order; the cart is read on the server.
 *  - Prices, discounts, delivery charge and totals are calculated here,
 *    never taken from the browser.
 *  - Placing an order happens in ONE transaction:
 *      stock is reduced (only if enough is left), soldCount increases,
 *      the order is saved and the cart is emptied.
 *    If anything fails, nothing changes - no half-finished orders.
 *  - Two customers buying the last item at the same moment: the stock
 *    update only succeeds for one of them; the other gets a clear error.
 *  - The same idempotencyKey twice returns the first order (no duplicates).
 *  - A customer can cancel only while the order is "pending"; the stock
 *    is then given back.
 */
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const cartService = require("./cart.service");
const settingsService = require("./settings.service");
const categoryService = require("./category.service");
const { normalizePhone } = require("./auth.service");

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const ORDER_NUMBER_PATTERN = /^[A-Z0-9]{1,6}-\d{6}-[A-Z0-9]{4}$/;
const PAGE_SIZE = 10;

function text(body, key, { min = 0, max, label = key }) {
  const value = body?.[key];
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new ApiError(400, `${label} must be text`);
  }
  const trimmed = (value || "").trim();
  if (trimmed.length < min) throw new ApiError(400, min > 1 ? `${label} is too short` : `${label} is required`);
  if (trimmed.length > max) throw new ApiError(400, `${label} is too long`);
  return trimmed;
}

function readShipping(body) {
  const shipping = body?.shipping || {};
  const phone = normalizePhone(text(shipping, "phone", { min: 1, max: 20, label: "Mobile number" }));
  if (!/^01[3-9]\d{8}$/.test(phone)) throw new ApiError(400, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  if (!["inside_dhaka", "outside_dhaka"].includes(shipping.area)) {
    throw new ApiError(400, "Choose a delivery area");
  }
  return {
    name: text(shipping, "name", { min: 2, max: 60, label: "Name" }),
    phone,
    area: shipping.area,
    city: text(shipping, "city", { min: 2, max: 60, label: "City / district" }),
    addressLine: text(shipping, "addressLine", { min: 5, max: 250, label: "Address" }),
    note: text(shipping, "note", { max: 300, label: "Delivery note" }),
  };
}

function deliveryChargeFor(area, subtotal, delivery) {
  if (delivery.freeDeliveryAbove != null && subtotal >= delivery.freeDeliveryAbove) return 0;
  return area === "inside_dhaka" ? delivery.insideDhaka : delivery.outsideDhaka;
}

function newOrderNumber(prefix) {
  const now = new Date();
  const date = [now.getFullYear() % 100, now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, "0")).join("");
  const random = crypto.randomBytes(3).readUIntBE(0, 3).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  const cleanPrefix = String(prefix || "ORD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ORD";
  return `${cleanPrefix}-${date}-${random}`;
}

// What the customer sees (no internal fields).
function publicOrder(order) {
  const o = order.toObject ? order.toObject() : order;
  delete o.idempotencyKey;
  delete o.__v;
  return o;
}

async function placeOrder(user, body) {
  const idempotencyKey = body?.idempotencyKey;
  if (typeof idempotencyKey !== "string" || !KEY_PATTERN.test(idempotencyKey)) {
    throw new ApiError(400, "Invalid checkout request. Please refresh the page and try again.");
  }

  // Same checkout submitted again (double click, retry): return the first order.
  const existing = await Order.findOne({ user: user._id, idempotencyKey });
  if (existing) return { order: publicOrder(existing), created: false };

  const shipping = readShipping(body);
  const settings = await settingsService.getSettings();
  if (body?.paymentMethod !== "cod" || !settings.payments?.cashOnDelivery) {
    throw new ApiError(400, "Choose an available payment method");
  }

  const cart = await cartService.findCart({ userId: user._id });
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Your cart is empty");

  // Current product data (published + visible category only).
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) }, isPublished: true }).lean();
  const visible = new Set((await categoryService.getVisibleCategoryIds()).map(String));
  const byId = new Map(products.filter((p) => visible.has(String(p.category))).map((p) => [String(p._id), p]));

  const problems = [];
  const items = [];
  for (const cartItem of cart.items) {
    const product = byId.get(String(cartItem.product));
    if (!product) {
      problems.push("An item in your cart is no longer available");
      continue;
    }
    if (product.stock < cartItem.quantity) {
      problems.push(product.stock > 0 ? `Only ${product.stock} of ${product.name} left` : `${product.name} is out of stock`);
      continue;
    }
    const finalPrice =
      product.discountPrice != null && product.discountPrice < product.price ? product.discountPrice : product.price;
    items.push({
      product: product._id,
      name: product.name,
      slug: product.slug,
      unit: product.unit,
      image: product.images?.[0] || null,
      price: product.price,
      finalPrice,
      quantity: cartItem.quantity,
      lineTotal: finalPrice * cartItem.quantity,
    });
  }
  if (problems.length) {
    throw new ApiError(409, "Some items in your cart changed. Please review your cart.", { problems });
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryCharge = deliveryChargeFor(shipping.area, subtotal, settings.delivery);

  const order = await mongoose.connection.transaction(async (session) => {
    for (const item of items) {
      const result = await Product.updateOne(
        { _id: item.product, isPublished: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, soldCount: item.quantity } },
        { session }
      );
      if (result.modifiedCount !== 1) {
        throw new ApiError(409, `${item.name} just sold out. Please review your cart.`, {
          problems: [`${item.name} is no longer available in that quantity`],
        });
      }
    }

    const [created] = await Order.create(
      [
        {
          orderNumber: newOrderNumber(settings.orderPrefix),
          user: user._id,
          items,
          subtotal,
          deliveryCharge,
          discount: 0,
          total: subtotal + deliveryCharge,
          currency: settings.currency?.code || "BDT",
          shipping,
          paymentMethod: "cod",
          paymentStatus: "unpaid",
          status: "pending",
          statusHistory: [{ status: "pending", note: "Order placed" }],
          idempotencyKey,
        },
      ],
      { session }
    );

    cart.items = [];
    await cart.save({ session });
    return created;
  });

  return { order: publicOrder(order), created: true };
}

async function listMyOrders(user, pageInput) {
  const page = Math.max(1, Math.min(1000, Number.parseInt(pageInput, 10) || 1));
  const [orders, total] = await Promise.all([
    Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("orderNumber items.name items.quantity total status createdAt shipping.area")
      .lean(),
    Order.countDocuments({ user: user._id }),
  ]);
  return { orders, pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } };
}

// A customer can only ever see their OWN orders.
async function findMyOrder(user, orderNumber) {
  const number = String(orderNumber || "").toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(number)) throw new ApiError(404, "Order not found");
  const order = await Order.findOne({ orderNumber: number, user: user._id });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

async function getMyOrder(user, orderNumber) {
  return publicOrder(await findMyOrder(user, orderNumber));
}

async function cancelMyOrder(user, orderNumber) {
  const order = await mongoose.connection.transaction(async (session) => {
    const found = await findMyOrder(user, orderNumber);
    // Only change it if it is STILL pending (protects against races).
    const updated = await Order.findOneAndUpdate(
      { _id: found._id, status: "pending" },
      {
        $set: { status: "cancelled" },
        $push: { statusHistory: { status: "cancelled", at: new Date(), note: "Cancelled by customer" } },
      },
      { new: true, session }
    );
    if (!updated) throw new ApiError(409, "This order can no longer be cancelled. Please contact us.");

    for (const item of updated.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity, soldCount: -item.quantity } },
        { session }
      );
    }
    return updated;
  });
  return publicOrder(order);
}

module.exports = { placeOrder, listMyOrders, getMyOrder, cancelMyOrder, deliveryChargeFor, newOrderNumber };
