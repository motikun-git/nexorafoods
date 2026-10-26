/*
 * Product management for admins.
 *  - Every field is validated on the server.
 *  - "Delete" is only allowed for products that were never ordered;
 *    otherwise unpublish them (they stay in old orders and reports).
 */
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Order = require("../../models/Order");
const ApiError = require("../../utils/ApiError");
const slugify = require("../../utils/slugify");
const { isValidId } = require("../category.service");

const PAGE_SIZE = 20;
const LOW_STOCK = 5;
const IMAGE_URL = /^(\/uploads\/[A-Za-z0-9/_.-]+|https:\/\/[^\s"'<>]+)$/;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readText(data, key, { required = false, max, label = key }) {
  const value = data[key];
  if (value === undefined) return undefined;
  if (value !== null && typeof value !== "string") throw new ApiError(400, `${label} must be text`);
  const trimmed = (value || "").trim();
  if (required && !trimmed) throw new ApiError(400, `${label} is required`);
  if (trimmed.length > max) throw new ApiError(400, `${label} is too long (max ${max})`);
  return trimmed;
}

function readNumber(data, key, { label = key, integer = false, nullable = false }) {
  const value = data[key];
  if (value === undefined) return undefined;
  if ((value === null || value === "") && nullable) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new ApiError(400, `${label} must be a number of 0 or more`);
  if (integer && !Number.isInteger(number)) throw new ApiError(400, `${label} must be a whole number`);
  if (number > 10_000_000) throw new ApiError(400, `${label} is too large`);
  return Math.round(number * 100) / 100;
}

function readBoolean(data, key) {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new ApiError(400, `${key} must be true or false`);
  return value;
}

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || "product";
  for (let i = 1; i < 1000; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    if (!(await Product.exists(query))) return slug;
  }
  throw new ApiError(500, "Could not create a unique link name");
}

// Reads and checks everything the admin form can send.
async function readProductInput(data, { creating, current }) {
  if (!data || typeof data !== "object") throw new ApiError(400, "Invalid product data");
  const input = {};

  const name = readText(data, "name", { required: creating, max: 150, label: "Name" });
  if (name !== undefined) {
    if (!name) throw new ApiError(400, "Name is required");
    input.name = name;
  }

  const description = readText(data, "description", { max: 5000, label: "Description" });
  if (description !== undefined) input.description = description;

  const unit = readText(data, "unit", { max: 30, label: "Unit" });
  if (unit !== undefined) input.unit = unit || "pcs";

  const sku = readText(data, "sku", { max: 60, label: "SKU" });
  if (sku !== undefined) input.sku = sku ? sku.toUpperCase() : undefined;

  if (data.slug !== undefined) {
    const slug = slugify(readText(data, "slug", { max: 120, label: "Link name" }));
    if (!slug) throw new ApiError(400, "Link name is invalid");
    input.slug = slug;
  }

  if (data.category !== undefined || creating) {
    if (!isValidId(data.category)) throw new ApiError(400, "Choose a category");
    if (!(await Category.exists({ _id: data.category }))) throw new ApiError(400, "The chosen category does not exist");
    input.category = data.category;
  }

  if (data.images !== undefined) {
    if (!Array.isArray(data.images) || data.images.length > 8) throw new ApiError(400, "Up to 8 images are allowed");
    for (const url of data.images) {
      if (typeof url !== "string" || url.length > 500 || !IMAGE_URL.test(url)) {
        throw new ApiError(400, "Images must be uploaded files or https:// links");
      }
    }
    input.images = data.images;
  }

  const price = readNumber(data, "price", { label: "Price" });
  if (price !== undefined) input.price = price;
  else if (creating) throw new ApiError(400, "Price is required");

  const discountPrice = readNumber(data, "discountPrice", { label: "Discount price", nullable: true });
  if (discountPrice !== undefined) input.discountPrice = discountPrice;

  const costPrice = readNumber(data, "costPrice", { label: "Cost price", nullable: true });
  if (costPrice !== undefined) input.costPrice = costPrice;

  const stock = readNumber(data, "stock", { label: "Stock", integer: true });
  if (stock !== undefined) input.stock = stock;

  for (const key of ["isPublished", "isFeatured"]) {
    const value = readBoolean(data, key);
    if (value !== undefined) input[key] = value;
  }

  const finalPrice = input.price ?? current?.price;
  const finalDiscount = input.discountPrice !== undefined ? input.discountPrice : current?.discountPrice;
  if (finalDiscount != null && finalPrice != null && finalDiscount >= finalPrice) {
    throw new ApiError(400, "Discount price must be lower than the regular price");
  }
  return input;
}

async function listProducts(query = {}) {
  const page = Math.max(1, Math.min(1000, Number.parseInt(query.page, 10) || 1));
  const filter = {};
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ name: regex }, { sku: regex }, { slug: regex }];
  }
  if (isValidId(query.category)) {
    filter.category = { $in: [query.category, ...(await Category.find({ ancestors: query.category }).distinct("_id"))] };
  }
  if (query.status === "published") filter.isPublished = true;
  if (query.status === "hidden") filter.isPublished = false;
  if (query.stock === "out") filter.stock = 0;
  if (query.stock === "low") filter.stock = { $gt: 0, $lte: LOW_STOCK };
  if (query.featured === "true") filter.isFeatured = true;

  const sorts = {
    newest: { createdAt: -1 },
    name: { name: 1 },
    "stock-asc": { stock: 1, name: 1 },
    "best-selling": { soldCount: -1 },
  };
  const sort = sorts[query.sort] || sorts.newest;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ ...sort, _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate("category", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } };
}

async function getProduct(id) {
  if (!isValidId(id)) throw new ApiError(400, "Invalid product id");
  const product = await Product.findById(id).populate("category", "name slug").lean();
  if (!product) throw new ApiError(404, "Product not found");
  return product;
}

async function createProduct(data) {
  const input = await readProductInput(data, { creating: true });
  input.slug = input.slug ? await uniqueSlug(input.slug) : await uniqueSlug(input.name);
  const product = await Product.create(input);
  return getProduct(product._id);
}

async function updateProduct(id, data) {
  if (!isValidId(id)) throw new ApiError(400, "Invalid product id");
  const product = await Product.findById(id);
  if (!product) throw new ApiError(404, "Product not found");
  const input = await readProductInput(data, { creating: false, current: product });
  if (input.slug) {
    if (await Product.exists({ slug: input.slug, _id: { $ne: product._id } })) {
      throw new ApiError(409, "Another product already uses this link name");
    }
  }
  if (input.sku === undefined && data.sku !== undefined) product.sku = undefined;
  Object.assign(product, input);
  await product.save();
  return getProduct(product._id);
}

async function deleteProduct(id) {
  if (!isValidId(id)) throw new ApiError(400, "Invalid product id");
  if (await Order.exists({ "items.product": id })) {
    throw new ApiError(409, "This product appears in orders, so it cannot be deleted. Hide it (unpublish) instead.");
  }
  const result = await Product.deleteOne({ _id: id });
  if (result.deletedCount === 0) throw new ApiError(404, "Product not found");
  return { deleted: true };
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, LOW_STOCK };
