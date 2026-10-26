/*
 * All business rules for categories live here, so routes/controllers stay
 * thin and the same rules apply everywhere (admin API, seed script, tests).
 *
 * PUBLICATION RULE
 *   A category is publicly visible only if it AND all of its ancestors are
 *   published. Unpublishing a parent hides its whole branch, but does not
 *   change the children's own isPublished value, so re-publishing the
 *   parent restores the branch exactly as it was.
 *
 * DELETION RULE
 *   An empty category can be deleted. A category with subcategories or
 *   products can only be deleted when the admin says where they should go
 *   (moveChildrenTo / moveProductsTo). Nothing is ever cascade-deleted.
 */
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const slugify = require("../utils/slugify");
const { MAX_CATEGORY_DEPTH } = require("../config/constants");

const MAX_LEVELS = MAX_CATEGORY_DEPTH + 1;
const PUBLIC_FIELDS = "name slug description image parentCategory ancestors depth sortOrder isPublished";

// ---------------------------------------------------------------- helpers

function isValidId(id) {
  return /^[a-f\d]{24}$/i.test(String(id));
}

function pick(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

async function findCategoryOrThrow(id, session = null) {
  if (!isValidId(id)) throw new ApiError(400, "Invalid category id");
  const category = await Category.findById(id).session(session);
  if (!category) throw new ApiError(404, "Category not found");
  return category;
}

async function findParentOrThrow(id, session = null) {
  if (!isValidId(id)) throw new ApiError(400, "Invalid parent category id");
  const parent = await Category.findById(id).session(session);
  if (!parent) throw new ApiError(400, "Parent category does not exist");
  return parent;
}

async function slugExists(slug, excludeId = null, session = null) {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Boolean(await Category.exists(query).session(session));
}

// "Organic" -> "organic"; if taken under another parent -> "fruits-organic";
// if that is taken too -> "fruits-organic-2", "-3", ...
async function generateUniqueSlug(name, parent = null, session = null) {
  const base = slugify(name) || "category";
  const candidates = [base];
  if (parent) candidates.push(`${parent.slug}-${base}`.slice(0, 110).replace(/-+$/, ""));

  for (const slug of candidates) {
    if (!(await slugExists(slug, null, session))) return slug;
  }
  const last = candidates[candidates.length - 1];
  for (let i = 2; i < 1000; i++) {
    const slug = `${last}-${i}`;
    if (!(await slugExists(slug, null, session))) return slug;
  }
  throw new ApiError(500, "Could not generate a unique slug");
}

async function nextSortOrder(parentId, session = null) {
  const last = await Category.findOne({ parentCategory: parentId || null })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .session(session);
  return last ? last.sortOrder + 1 : 0;
}

function depthError() {
  return new ApiError(400, `Categories can be nested at most ${MAX_LEVELS} levels deep`);
}

// Ids of categories the public may see (published, all ancestors published,
// and no missing ancestors).
function filterVisible(categories) {
  const allIds = new Set(categories.map((c) => String(c._id)));
  const hidden = new Set(categories.filter((c) => !c.isPublished).map((c) => String(c._id)));

  return categories.filter(
    (c) =>
      c.isPublished &&
      c.ancestors.every((a) => allIds.has(String(a)) && !hidden.has(String(a)))
  );
}

function sortNodes(nodes) {
  nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  nodes.forEach((n) => sortNodes(n.children));
  return nodes;
}

// Flat list -> nested tree. Each node gets a `children` array.
function buildTree(categories) {
  const nodes = new Map(categories.map((c) => [String(c._id), { ...c, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parentId = node.parentCategory ? String(node.parentCategory) : null;
    if (parentId && nodes.has(parentId)) nodes.get(parentId).children.push(node);
    else roots.push(node); // root (or orphan, shown at top level so admin can fix it)
  }
  return sortNodes(roots);
}

// Adds totalProductCount = own products + products of all descendants.
function addTotals(nodes) {
  for (const node of nodes) {
    addTotals(node.children);
    node.totalProductCount =
      node.directProductCount + node.children.reduce((sum, c) => sum + c.totalProductCount, 0);
  }
  return nodes;
}

async function productCountsByCategory(match = {}) {
  const rows = await Product.aggregate([
    { $match: match },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

// ------------------------------------------------------------ admin writes

async function createCategory(data, { isDemo = false } = {}) {
  const input = pick(data, ["name", "description", "image", "isPublished", "sortOrder", "parentCategory"]);
  if (!input.name || !String(input.name).trim()) {
    throw new ApiError(400, "Category name is required");
  }

  let parent = null;
  if (input.parentCategory) {
    parent = await findParentOrThrow(input.parentCategory);
    if (parent.depth + 1 > MAX_CATEGORY_DEPTH) throw depthError();
  }

  const category = new Category({
    ...input,
    parentCategory: parent ? parent._id : null,
    ancestors: parent ? [...parent.ancestors, parent._id] : [],
    depth: parent ? parent.depth + 1 : 0,
    slug: await generateUniqueSlug(input.name, parent),
    sortOrder: Number.isInteger(input.sortOrder)
      ? input.sortOrder
      : await nextSortOrder(parent ? parent._id : null),
    isDemo,
  });
  return category.save();
}

async function updateCategory(id, data) {
  if (data && "parentCategory" in data) {
    throw new ApiError(400, "Use the move action to change a category's parent");
  }
  const category = await findCategoryOrThrow(id);
  const input = pick(data, ["name", "description", "image", "isPublished", "sortOrder", "slug"]);

  // Renaming does NOT change the slug, so shared links keep working.
  // The admin may still change the slug explicitly.
  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (!slug) throw new ApiError(400, "Invalid slug");
    if (await slugExists(slug, category._id)) {
      throw new ApiError(409, "This slug is already used by another category");
    }
    input.slug = slug;
  }

  Object.assign(category, input);
  return category.save();
}

// Moves a category (and its whole branch) under a new parent, or to the
// top level when newParentId is null. Must run inside a transaction.
async function moveSubtree(category, newParentId, session) {
  let newParent = null;

  if (newParentId) {
    if (!isValidId(newParentId)) throw new ApiError(400, "Invalid parent category id");
    if (String(newParentId) === String(category._id)) {
      throw new ApiError(400, "A category cannot be its own parent");
    }
    newParent = await Category.findById(newParentId).session(session);
    if (!newParent) throw new ApiError(400, "Target parent category does not exist");
    if (newParent.ancestors.some((a) => a.equals(category._id))) {
      throw new ApiError(400, "A category cannot be moved inside one of its own subcategories");
    }
  }

  const currentParentId = category.parentCategory ? String(category.parentCategory) : null;
  const targetParentId = newParent ? String(newParent._id) : null;
  if (currentParentId === targetParentId) return category; // already there

  const descendants = await Category.find({ ancestors: category._id })
    .select("ancestors depth")
    .session(session);
  const branchHeight = descendants.reduce((max, d) => Math.max(max, d.depth - category.depth), 0);
  const newDepth = newParent ? newParent.depth + 1 : 0;
  if (newDepth + branchHeight > MAX_CATEGORY_DEPTH) throw depthError();

  const newAncestors = newParent ? [...newParent.ancestors, newParent._id] : [];
  category.parentCategory = newParent ? newParent._id : null;
  category.ancestors = newAncestors;
  category.depth = newDepth;
  category.sortOrder = await nextSortOrder(category.parentCategory, session);
  await category.save({ session });

  // Rewrite the ancestor path of every category inside the moved branch.
  if (descendants.length) {
    const operations = descendants.map((d) => {
      const index = d.ancestors.findIndex((a) => a.equals(category._id));
      const ancestors = [...newAncestors, category._id, ...d.ancestors.slice(index + 1)];
      return {
        updateOne: {
          filter: { _id: d._id },
          update: { $set: { ancestors, depth: ancestors.length } },
        },
      };
    });
    await Category.bulkWrite(operations, { session });
  }
  return category;
}

async function moveCategory(id, newParentId) {
  // A transaction makes the move all-or-nothing: either the whole branch
  // moves, or nothing changes.
  return mongoose.connection.transaction(async (session) => {
    const category = await findCategoryOrThrow(id, session);
    return moveSubtree(category, newParentId || null, session);
  });
}

// items: [{ id, sortOrder }] - all must share the same parent.
async function reorderCategories(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Provide a non-empty list of { id, sortOrder }");
  }
  if (items.length > 500) throw new ApiError(400, "Too many categories in one request");

  for (const item of items) {
    if (!item || !isValidId(item.id) || !Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
      throw new ApiError(400, "Each item needs a valid id and a whole-number sortOrder >= 0");
    }
  }
  const ids = items.map((i) => String(i.id));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, "Duplicate category ids");

  const categories = await Category.find({ _id: { $in: ids } }).select("parentCategory");
  if (categories.length !== ids.length) throw new ApiError(404, "One or more categories were not found");

  const parents = new Set(categories.map((c) => String(c.parentCategory)));
  if (parents.size > 1) {
    throw new ApiError(400, "Only categories with the same parent can be reordered together");
  }

  await Category.bulkWrite(
    items.map((i) => ({
      updateOne: { filter: { _id: i.id }, update: { $set: { sortOrder: i.sortOrder } } },
    }))
  );
  return { updated: items.length };
}

// options.moveProductsTo: category id for this category's direct products
// options.moveChildrenTo: new parent id for its direct subcategories,
//                         or null to make them top-level categories
async function deleteCategory(id, options = {}) {
  const { moveProductsTo, moveChildrenTo } = options;

  return mongoose.connection.transaction(async (session) => {
    const category = await findCategoryOrThrow(id, session);
    const children = await Category.find({ parentCategory: category._id }).session(session);
    const productCount = await Product.countDocuments({ category: category._id }).session(session);

    const problems = [];
    if (children.length && moveChildrenTo === undefined) {
      problems.push(`Choose where to move ${children.length} subcategories`);
    }
    if (productCount && !moveProductsTo) {
      problems.push(`Choose where to move ${productCount} products`);
    }
    if (problems.length) {
      throw new ApiError(409, "This category is not empty", {
        childCount: children.length,
        productCount,
        problems,
      });
    }

    if (productCount) {
      if (!isValidId(moveProductsTo)) throw new ApiError(400, "Invalid target category for products");
      if (String(moveProductsTo) === String(category._id)) {
        throw new ApiError(400, "Products cannot be moved to the category being deleted");
      }
      const target = await Category.findById(moveProductsTo).session(session);
      if (!target) throw new ApiError(400, "Target category for products does not exist");
      await Product.updateMany(
        { category: category._id },
        { $set: { category: target._id } },
        { session }
      );
    }

    if (children.length && moveChildrenTo) {
      if (!isValidId(moveChildrenTo)) throw new ApiError(400, "Invalid target parent for subcategories");
      const target = await Category.findById(moveChildrenTo).session(session);
      if (!target) throw new ApiError(400, "Target parent for subcategories does not exist");
      if (target._id.equals(category._id) || target.ancestors.some((a) => a.equals(category._id))) {
        throw new ApiError(400, "Subcategories must be moved outside the category being deleted");
      }
    }
    for (const child of children) {
      await moveSubtree(child, moveChildrenTo || null, session);
    }

    await Category.deleteOne({ _id: category._id }, { session });
    return { deleted: true, movedProducts: productCount, movedSubcategories: children.length };
  });
}

// ------------------------------------------------------------- admin reads

// Whole tree including hidden categories, with counts for the admin panel.
// With `search`, returns a flat list of matches with their full path.
async function getAdminCategories({ search } = {}) {
  const all = await Category.find().lean();
  const visibleIds = new Set(filterVisible(all).map((c) => String(c._id)));
  const productCounts = await productCountsByCategory();
  const childCounts = new Map();
  for (const c of all) {
    if (c.parentCategory) {
      const key = String(c.parentCategory);
      childCounts.set(key, (childCounts.get(key) || 0) + 1);
    }
  }

  const enriched = all.map((c) => ({
    ...c,
    isVisible: visibleIds.has(String(c._id)),
    childCount: childCounts.get(String(c._id)) || 0,
    directProductCount: productCounts.get(String(c._id)) || 0,
  }));

  if (search && String(search).trim()) {
    const term = String(search).trim().toLowerCase();
    const byId = new Map(enriched.map((c) => [String(c._id), c]));
    return {
      results: enriched
        .filter((c) => c.name.toLowerCase().includes(term) || c.slug.includes(term))
        .map((c) => ({
          ...c,
          path: [...c.ancestors.map((a) => byId.get(String(a))?.name || "?"), c.name].join(" › "),
        })),
    };
  }

  return { tree: addTotals(buildTree(enriched)), total: all.length, maxLevels: MAX_LEVELS };
}

// ------------------------------------------------------------ public reads

async function getPublicTree() {
  const all = await Category.find().select(PUBLIC_FIELDS).lean();
  const visible = filterVisible(all);
  const counts = await productCountsByCategory({ isPublished: true });

  const nodes = visible.map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    parentCategory: c.parentCategory,
    depth: c.depth,
    sortOrder: c.sortOrder,
    directProductCount: counts.get(String(c._id)) || 0,
  }));
  return addTotals(buildTree(nodes));
}

// Returns the category, its breadcrumb and visible children, or 404 if the
// category (or any parent) is hidden.
async function getPublicCategoryBySlug(slug) {
  const category = await Category.findOne({ slug: String(slug).toLowerCase() }).select(PUBLIC_FIELDS).lean();
  if (!category || !category.isPublished) throw new ApiError(404, "Category not found");

  const ancestors = await Category.find({ _id: { $in: category.ancestors } }).select(PUBLIC_FIELDS).lean();
  if (ancestors.length !== category.ancestors.length || ancestors.some((a) => !a.isPublished)) {
    throw new ApiError(404, "Category not found");
  }
  const byId = new Map(ancestors.map((a) => [String(a._id), a]));
  const breadcrumb = category.ancestors.map((id) => {
    const a = byId.get(String(id));
    return { _id: a._id, name: a.name, slug: a.slug };
  });

  const children = await Category.find({ parentCategory: category._id, isPublished: true })
    .select("name slug image sortOrder")
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return { category, breadcrumb, children };
}

// Category ids whose products may be shown publicly.
async function getVisibleCategoryIds() {
  const all = await Category.find().select("ancestors isPublished").lean();
  return filterVisible(all).map((c) => c._id);
}

// For the Shop page:
//   mode "all"    -> the category + every visible descendant (aggregate)
//   mode "direct" -> only the category itself
async function getVisibleCategoryIdsFor(categoryId, mode = "all") {
  const visibleIds = await getVisibleCategoryIds();
  const visible = new Set(visibleIds.map(String));
  if (!visible.has(String(categoryId))) throw new ApiError(404, "Category not found");
  if (mode === "direct") return [categoryId];

  const descendants = await Category.find({ ancestors: categoryId }).select("_id").lean();
  return [categoryId, ...descendants.map((d) => d._id).filter((id) => visible.has(String(id)))];
}

module.exports = {
  isValidId,
  createCategory,
  updateCategory,
  moveCategory,
  reorderCategories,
  deleteCategory,
  getAdminCategories,
  getPublicTree,
  getPublicCategoryBySlug,
  getVisibleCategoryIds,
  getVisibleCategoryIdsFor,
};
