const express = require("express");
const orders = require("../services/order.service");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Every order route needs a logged-in customer.
router.use(requireAuth);

// POST /api/orders  { shipping, paymentMethod: "cod", idempotencyKey }
router.post("/", async (req, res) => {
  const { order, created } = await orders.placeOrder(req.user, req.body);
  res.status(created ? 201 : 200).json({ success: true, data: order });
});

// GET /api/orders?page=1  -> my orders
router.get("/", async (req, res) => {
  const { orders: list, pagination } = await orders.listMyOrders(req.user, req.query.page);
  res.json({ success: true, data: list, pagination });
});

// GET /api/orders/:orderNumber
router.get("/:orderNumber", async (req, res) => {
  res.json({ success: true, data: await orders.getMyOrder(req.user, req.params.orderNumber) });
});

// POST /api/orders/:orderNumber/cancel
router.post("/:orderNumber/cancel", async (req, res) => {
  res.json({ success: true, data: await orders.cancelMyOrder(req.user, req.params.orderNumber) });
});

module.exports = router;
