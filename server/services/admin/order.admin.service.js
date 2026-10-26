/*
 * Order management for admins.
 *
 * Allowed status changes (anything else is refused):
 *   pending    -> confirmed | cancelled
 *   confirmed  -> processing | cancelled
 *   processing -> shipped | cancelled
 *   shipped    -> delivered | cancelled (e.g. returned by courier)
 *   delivered, cancelled -> (final)
 *
 * Cancelling gives the stock back. "Delivered" marks a Cash-on-Delivery
 * order as paid.
 */
const mongoose = require("mongoose");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const ApiError = require("../../utils/ApiError");

const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
const PAGE_SIZE = 20;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listOrders(query = {}) {
  const page = Math.max(1, Math.min(1000, Number.parseInt(query.page, 10) || 1));
  const filter = {};
  if (typeof query.status === "string" && TRANSITIONS[query.status]) filter.status = query.status;

  const search = typeof query.search === "string" ? query.search.trim().slice(0, 60) : "";
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ orderNumber: regex }, { "shipping.phone": regex }, { "shipping.name": regex }];
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    filter.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (to && !Number.isNaN(to.getTime())) filter.createdAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  const [items, total, counts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("orderNumber status total createdAt shipping.name shipping.phone shipping.area items.quantity paymentStatus")
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  return {
    items,
    pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
  };
}

async function findOrder(orderNumber) {
  const number = String(orderNumber || "").toUpperCase().slice(0, 30);
  const order = await Order.findOne({ orderNumber: number }).populate("user", "name email phone");
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

async function getOrder(orderNumber) {
  const order = await findOrder(orderNumber);
  return { ...order.toObject(), allowedNextStatuses: TRANSITIONS[order.status] };
}

async function updateStatus(orderNumber, body, admin) {
  const next = body?.status;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (typeof next !== "string" || !TRANSITIONS[next]) throw new ApiError(400, "Invalid status");

  await mongoose.connection.transaction(async (session) => {
    const order = await findOrder(orderNumber);
    if (!TRANSITIONS[order.status].includes(next)) {
      throw new ApiError(400, `An order that is "${order.status}" cannot be changed to "${next}"`);
    }

    const update = {
      $set: { status: next, ...(next === "delivered" ? { paymentStatus: "paid" } : {}) },
      $push: { statusHistory: { status: next, at: new Date(), note: note || `Changed by ${admin.name}` } },
    };
    // Only succeeds if nobody changed the status in the meantime.
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, update, { new: true, session });
    if (!updated) throw new ApiError(409, "This order was just changed by someone else. Please reload.");

    if (next === "cancelled") {
      for (const item of updated.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity, soldCount: -item.quantity } }, { session });
      }
    }
  });

  return getOrder(orderNumber);
}

module.exports = { listOrders, getOrder, updateStatus, TRANSITIONS };
