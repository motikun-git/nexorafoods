// Controllers only translate HTTP <-> service calls.
// Errors thrown here are sent to the error middleware automatically (Express 5).
const categoryService = require("../services/category.service");
const productService = require("../services/product.service");

async function getCategoryTree(req, res) {
  const tree = await categoryService.getPublicTree();
  res.json({ success: true, data: tree });
}

async function getCategory(req, res) {
  const data = await categoryService.getPublicCategoryBySlug(req.params.slug);
  res.json({ success: true, data });
}

async function listProducts(req, res) {
  const { items, pagination, filters } = await productService.listPublicProducts(req.query);
  res.json({ success: true, data: items, pagination, filters });
}

async function getProduct(req, res) {
  const data = await productService.getPublicProductBySlug(req.params.slug);
  res.json({ success: true, data });
}

async function getHome(req, res) {
  const data = await productService.getHomeProducts();
  res.json({ success: true, data });
}

module.exports = { getCategoryTree, getCategory, listProducts, getProduct, getHome };
