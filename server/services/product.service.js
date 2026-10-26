/*
 * Public (customer-facing) product queries.
 *
 * VISIBILITY RULE: a product is shown only if it is published AND its
 * category is publicly visible (published, with every parent published).
 *
 * PRICE RULE: "finalPrice" = discountPrice when it is valid (lower than the
 * regular price), otherwise price. Filters and sorting use finalPrice,
 * i.e. the price the customer actually pays.
 */
const Product = require("../models/Product");
const Category = require("../models/Category");
const ApiError = require("../utils/ApiError");
const categoryService = require("./category.service");

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;
const HOME_LIMIT = 10;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SORTS = {
  recommended: { isFeatured: -1, soldCount: -1, createdAt: -1, _id: 1 },
  "price-asc": { finalPrice: 1, _id: 1 },
  "price-desc": { finalPrice: -1, _id: 1 },
  "name-asc": { name: 1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  popular: { soldCount: -1, _id: 1 },
};

const FINAL_PRICE = {
  $cond: [
    { $and: [{ $isNumber: "$discountPrice" }, { $lt: ["$discountPrice", "$price"] }] },
    "$discountPrice",
    "$price",
  ],
};

// Fields sent to customers in product lists (no cost price, no internal flags).
const LIST_FIELDS = {
  name: 1,
  slug: 1,
  images: 1,
  unit: 1,
  price: 1,
  discountPrice: 1,
  finalPrice: 1,
  stock: 1,
  isFeatured: 1,
  category: 1,
  hasDiscount: { $lt: ["$finalPrice", "$price"] },
  inStock: { $gt: ["$stock", 0] },
};

// ------------------------------------------------------- query validation

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readString(query, key) {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new ApiError(400, `Query parameter "${key}" must appear once`);
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readInt(query, key, { min, max, fallback }) {
  const value = readString(query, key);
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ApiError(400, `"${key}" must be a whole number between ${min} and ${max}`);
  }
  return number;
}

function readPrice(query, key) {
  const value = readString(query, key);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new ApiError(400, `"${key}" must be a number >= 0`);
  return number;
}

function readBoolean(query, key) {
  const value = readString(query, key);
  if (value === undefined || value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  throw new ApiError(400, `"${key}" must be true or false`);
}

function parseListQuery(query = {}) {
  const parsed = {
    search: readString(query, "search"),
    category: readString(query, "category"),
    mode: readString(query, "mode") || "all",
    sort: readString(query, "sort") || "recommended",
    minPrice: readPrice(query, "minPrice"),
    maxPrice: readPrice(query, "maxPrice"),
    inStock: readBoolean(query, "inStock"),
    featured: readBoolean(query, "featured"),
    page: readInt(query, "page", { min: 1, max: 1000, fallback: 1 }),
    limit: readInt(query, "limit", { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT }),
  };

  if (parsed.search && parsed.search.length > 100) throw new ApiError(400, "Search text is too long");
  if (parsed.category) {
    parsed.category = parsed.category.toLowerCase();
    if (!SLUG_PATTERN.test(parsed.category)) throw new ApiError(400, "Invalid category");
  }
  if (!["all", "direct"].includes(parsed.mode)) throw new ApiError(400, '"mode" must be "all" or "direct"');
  if (!SORTS[parsed.sort]) {
    throw new ApiError(400, `"sort" must be one of: ${Object.keys(SORTS).join(", ")}`);
  }
  if (parsed.minPrice !== undefined && parsed.maxPrice !== undefined && parsed.minPrice > parsed.maxPrice) {
    throw new ApiError(400, "minPrice cannot be greater than maxPrice");
  }
  return parsed;
}

// ---------------------------------------------------------------- queries

async function runList(match, { sort = SORTS.recommended, skip = 0, limit = DEFAULT_LIMIT, priceMatch } = {}) {
  const pipeline = [{ $match: match }, { $addFields: { finalPrice: FINAL_PRICE } }];
  if (priceMatch && Object.keys(priceMatch).length) pipeline.push({ $match: { finalPrice: priceMatch } });
  pipeline.push({
    $facet: {
      items: [{ $sort: sort }, { $skip: skip }, { $limit: limit }, { $project: LIST_FIELDS }],
      total: [{ $count: "count" }],
    },
  });

  const [result] = await Product.aggregate(pipeline).collation({ locale: "en", strength: 2 });
  return { items: result.items, total: result.total[0]?.count || 0 };
}

// GET /api/products
async function listPublicProducts(rawQuery) {
  const q = parseListQuery(rawQuery);

  let categoryIds;
  if (q.category) {
    const category = await Category.findOne({ slug: q.category }).select("_id").lean();
    if (!category) throw new ApiError(404, "Category not found");
    categoryIds = await categoryService.getVisibleCategoryIdsFor(category._id, q.mode);
  } else {
    categoryIds = await categoryService.getVisibleCategoryIds();
  }

  const match = { isPublished: true, category: { $in: categoryIds } };
  if (q.search) match.name = { $regex: escapeRegex(q.search), $options: "i" };
  if (q.inStock) match.stock = { $gt: 0 };
  if (q.featured) match.isFeatured = true;

  const priceMatch = {};
  if (q.minPrice !== undefined) priceMatch.$gte = q.minPrice;
  if (q.maxPrice !== undefined) priceMatch.$lte = q.maxPrice;

  const { items, total } = await runList(match, {
    sort: SORTS[q.sort],
    skip: (q.page - 1) * q.limit,
    limit: q.limit,
    priceMatch,
  });

  return {
    items,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
    filters: q,
  };
}

// GET /api/products/:slug
async function getPublicProductBySlug(slug) {
  const cleanSlug = String(slug).toLowerCase();
  if (!SLUG_PATTERN.test(cleanSlug)) throw new ApiError(404, "Product not found");

  const [product] = await Product.aggregate([
    { $match: { slug: cleanSlug, isPublished: true } },
    { $addFields: { finalPrice: FINAL_PRICE } },
    { $project: { ...LIST_FIELDS, description: 1 } },
  ]);
  if (!product) throw new ApiError(404, "Product not found");

  const visible = new Set((await categoryService.getVisibleCategoryIds()).map(String));
  if (!visible.has(String(product.category))) throw new ApiError(404, "Product not found");

  const category = await Category.findById(product.category).select("name slug ancestors").lean();
  const ancestors = await Category.find({ _id: { $in: category.ancestors } }).select("name slug").lean();
  const byId = new Map(ancestors.map((a) => [String(a._id), a]));
  const breadcrumb = [...category.ancestors.map((id) => byId.get(String(id))), category].map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
  }));

  const { items: related } = await runList(
    { isPublished: true, category: product.category, _id: { $ne: product._id } },
    { sort: SORTS.popular, limit: 4 }
  );

  return { product, breadcrumb, related };
}

// GET /api/home
// featured = products the admin marked as featured
// popular  = best sellers by soldCount (> 0), excluding featured ones so the
//            homepage never shows the same product twice
async function getHomeProducts() {
  const categoryIds = await categoryService.getVisibleCategoryIds();
  const base = { isPublished: true, category: { $in: categoryIds } };

  const { items: featured } = await runList(
    { ...base, isFeatured: true },
    { sort: { soldCount: -1, createdAt: -1, _id: 1 }, limit: HOME_LIMIT }
  );
  const { items: popular } = await runList(
    { ...base, soldCount: { $gt: 0 }, _id: { $nin: featured.map((p) => p._id) } },
    { sort: SORTS.popular, limit: HOME_LIMIT }
  );

  return { featured, popular };
}

module.exports = { listPublicProducts, getPublicProductBySlug, getHomeProducts, SORTS };
