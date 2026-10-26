const express = require("express");
const catalog = require("../controllers/catalog.controller");

const router = express.Router();

// Categories
router.get("/categories/tree", catalog.getCategoryTree);
router.get("/categories/:slug", catalog.getCategory);

// Products
router.get("/products", catalog.listProducts);
router.get("/products/:slug", catalog.getProduct);

// Homepage sections (featured + popular)
router.get("/home", catalog.getHome);

module.exports = router;
