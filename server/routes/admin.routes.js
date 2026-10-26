/*
 * Admin API. EVERY route here requires an admin account - checked on the
 * server, so hiding admin buttons in the browser is not what protects it.
 */
const express = require("express");
const { requireAdmin } = require("../middleware/auth.middleware");
const categoryService = require("../services/category.service");
const products = require("../services/admin/product.admin.service");
const orders = require("../services/admin/order.admin.service");
const dashboard = require("../services/admin/dashboard.admin.service");
const settings = require("../services/admin/settings.admin.service");
const { getSettings } = require("../services/settings.service");
const uploadRoutes = require("./upload.routes");

const router = express.Router();
router.use(requireAdmin);

// ---------- Dashboard ----------
router.get("/summary", async (req, res) => {
  res.json({ success: true, data: await dashboard.getSummary() });
});

// ---------- Categories ----------
router.get("/categories", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.slice(0, 80) : "";
  res.json({ success: true, data: await categoryService.getAdminCategories({ search }) });
});
router.post("/categories", async (req, res) => {
  res.status(201).json({ success: true, data: await categoryService.createCategory(req.body) });
});
// (before "/categories/:id" so "reorder" is not read as an id)
router.patch("/categories/reorder", async (req, res) => {
  res.json({ success: true, data: await categoryService.reorderCategories(req.body?.items) });
});
router.patch("/categories/:id", async (req, res) => {
  res.json({ success: true, data: await categoryService.updateCategory(req.params.id, req.body) });
});
router.patch("/categories/:id/move", async (req, res) => {
  res.json({ success: true, data: await categoryService.moveCategory(req.params.id, req.body?.parentCategory ?? null) });
});
router.delete("/categories/:id", async (req, res) => {
  const { moveProductsTo, moveChildrenTo } = req.body || {};
  res.json({ success: true, data: await categoryService.deleteCategory(req.params.id, { moveProductsTo, moveChildrenTo }) });
});

// ---------- Products ----------
router.get("/products", async (req, res) => {
  const { items, pagination } = await products.listProducts(req.query);
  res.json({ success: true, data: items, pagination });
});
router.get("/products/:id", async (req, res) => {
  res.json({ success: true, data: await products.getProduct(req.params.id) });
});
router.post("/products", async (req, res) => {
  res.status(201).json({ success: true, data: await products.createProduct(req.body) });
});
router.patch("/products/:id", async (req, res) => {
  res.json({ success: true, data: await products.updateProduct(req.params.id, req.body) });
});
router.delete("/products/:id", async (req, res) => {
  res.json({ success: true, data: await products.deleteProduct(req.params.id) });
});

// ---------- Orders ----------
router.get("/orders", async (req, res) => {
  const { items, pagination, statusCounts } = await orders.listOrders(req.query);
  res.json({ success: true, data: items, pagination, statusCounts });
});
router.get("/orders/:orderNumber", async (req, res) => {
  res.json({ success: true, data: await orders.getOrder(req.params.orderNumber) });
});
router.patch("/orders/:orderNumber/status", async (req, res) => {
  res.json({ success: true, data: await orders.updateStatus(req.params.orderNumber, req.body, req.user) });
});

// ---------- Store settings ----------
router.get("/settings", async (req, res) => {
  res.json({ success: true, data: await getSettings() });
});
router.patch("/settings", async (req, res) => {
  res.json({ success: true, data: await settings.updateSettings(req.body) });
});

// ---------- Image uploads ----------
router.use("/uploads", uploadRoutes);

module.exports = router;
