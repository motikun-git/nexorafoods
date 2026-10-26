/*
 * DEMO DATA for development and client demos.
 * Every record created here has isDemo: true.
 *
 *   npm.cmd run seed:demo          -> add demo subcategories + products
 *   npm.cmd run seed:demo:remove   -> remove ONLY demo records
 *
 * Prices are the sample prices from the original website, not real prices.
 * Safe to run more than once (existing records are skipped).
 */
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { createCategory } = require("../services/category.service");
const slugify = require("../utils/slugify");

// parent slug -> demo subcategories (nested with `children`)
const DEMO_SUBCATEGORIES = {
  "fruits-and-vegetables": [
    { name: "Fruits", children: [{ name: "Local Fruits" }, { name: "Imported Fruits" }] },
    { name: "Vegetables" },
  ],
  "dairy-and-eggs": [{ name: "Milk" }, { name: "Eggs" }],
  "rice-dal-and-grains": [{ name: "Rice" }, { name: "Dal & Lentils" }],
  "bakery-and-snacks": [{ name: "Bread" }],
  beverages: [{ name: "Juice" }],
};

// category: slug path, e.g. "fruits-and-vegetables/vegetables" or a root slug
const DEMO_PRODUCTS = [
  // The 10 products from the original homepage (same sample prices)
  { name: "Potato", category: "fruits-and-vegetables/vegetables", price: 40, unit: "kg", stock: 120, isFeatured: true, soldCount: 85 },
  { name: "Onion", category: "fruits-and-vegetables/vegetables", price: 60, discountPrice: 50, unit: "kg", stock: 90, isFeatured: true, soldCount: 70 },
  { name: "Tomato", category: "fruits-and-vegetables/vegetables", price: 50, unit: "kg", stock: 60, isFeatured: true, soldCount: 40 },
  { name: "Eggs", category: "dairy-and-eggs/eggs", price: 150, unit: "dozen", stock: 50, isFeatured: true, soldCount: 64 },
  { name: "Milk", category: "dairy-and-eggs/milk", price: 100, discountPrice: 90, unit: "litre", stock: 40, isFeatured: true, soldCount: 52 },
  { name: "Rice", category: "rice-dal-and-grains/rice", price: 75, unit: "kg", stock: 200, isFeatured: true, soldCount: 95 },
  { name: "Apple", category: "fruits-and-vegetables/fruits/imported-fruits", price: 220, discountPrice: 200, unit: "kg", stock: 30, isFeatured: true, soldCount: 22 },
  { name: "Banana", category: "fruits-and-vegetables/fruits/local-fruits", price: 80, unit: "dozen", stock: 45, isFeatured: true, soldCount: 31 },
  { name: "Bread", category: "bakery-and-snacks/bread", price: 60, unit: "pack", stock: 25, isFeatured: true, soldCount: 18 },
  { name: "Juice", category: "beverages/juice", price: 120, discountPrice: 100, unit: "pack", stock: 35, isFeatured: true, soldCount: 27 },
  // Extra demo products (popular, root-level, out of stock...)
  { name: "Mango", category: "fruits-and-vegetables/fruits/local-fruits", price: 180, discountPrice: 160, unit: "kg", stock: 0, soldCount: 120 },
  { name: "Masoor Dal", category: "rice-dal-and-grains/dal-and-lentils", price: 140, unit: "kg", stock: 80, soldCount: 66 },
  { name: "Miniket Rice 5kg", category: "rice-dal-and-grains/rice", price: 420, discountPrice: 395, unit: "bag", stock: 40, soldCount: 58 },
  { name: "Rui Fish", category: "meat-and-fish", price: 350, unit: "kg", stock: 15, soldCount: 47 },
  { name: "Broiler Chicken", category: "meat-and-fish", price: 210, unit: "kg", stock: 20, soldCount: 75 },
  { name: "Soybean Oil 1L", category: "cooking-essentials", price: 190, unit: "bottle", stock: 70, soldCount: 88 },
  { name: "Green Tea", category: "beverages", price: 250, unit: "box", stock: 18, soldCount: 9 },
  { name: "Mixed Nuts", category: "nuts-and-dry-fruits", price: 650, discountPrice: 590, unit: "500 g", stock: 12, soldCount: 14 },
  { name: "Organic Honey", category: "organic", price: 550, unit: "500 g", stock: 10, soldCount: 21 },
  { name: "Frozen Paratha", category: "frozen-food", price: 160, unit: "pack", stock: 33, soldCount: 39 },
];

async function findOrCreateChild(parent, name) {
  const existing = await Category.findOne({ parentCategory: parent._id, name });
  if (existing) return { category: existing, created: false };
  const category = await createCategory({ name, parentCategory: parent._id }, { isDemo: true });
  return { category, created: true };
}

async function createSubtree(parent, items, path, index, stats) {
  for (const item of items) {
    const { category, created } = await findOrCreateChild(parent, item.name);
    const key = `${path}/${slugify(item.name)}`;
    index.set(key, category);
    created ? stats.categories++ : stats.skipped++;
    if (item.children) await createSubtree(category, item.children, key, index, stats);
  }
}

async function seed() {
  const stats = { categories: 0, products: 0, skipped: 0 };
  const index = new Map(); // "parent/child" path -> category document

  const roots = await Category.find({ parentCategory: null });
  for (const root of roots) index.set(root.slug, root);

  for (const [rootSlug, children] of Object.entries(DEMO_SUBCATEGORIES)) {
    const root = index.get(rootSlug);
    if (!root) {
      console.log(`  skip     subcategories of "${rootSlug}" (main category not found)`);
      continue;
    }
    await createSubtree(root, children, rootSlug, index, stats);
  }

  for (const item of DEMO_PRODUCTS) {
    const category = index.get(item.category);
    if (!category) {
      console.log(`  skip     ${item.name} (category ${item.category} not found)`);
      continue;
    }
    const slug = slugify(item.name);
    if (await Product.exists({ slug })) {
      stats.skipped++;
      continue;
    }
    await Product.create({
      ...item,
      slug,
      category: category._id,
      description: `${item.name} - demo product for testing the Nexora Food store.`,
      isDemo: true,
    });
    console.log(`  created  ${item.name}  (${item.category})`);
    stats.products++;
  }

  console.log(
    `\nDone: ${stats.categories} demo subcategories and ${stats.products} demo products created, ${stats.skipped} skipped.`
  );
}

async function removeDemo() {
  const { deletedCount } = await Product.deleteMany({ isDemo: true });
  console.log(`  removed  ${deletedCount} demo products`);

  // Deepest first, so children are removed before their parents.
  const demoCategories = await Category.find({ isDemo: true }).sort({ depth: -1 });
  let removed = 0;
  for (const category of demoCategories) {
    const hasChildren = await Category.exists({ parentCategory: category._id });
    const hasProducts = await Product.exists({ category: category._id });
    if (hasChildren || hasProducts) {
      console.log(`  keep     ${category.name} (contains your real products or subcategories)`);
      continue;
    }
    await Category.deleteOne({ _id: category._id });
    removed++;
  }
  console.log(`  removed  ${removed} demo subcategories\n\nDone. Your real categories were not touched.`);
}

const remove = process.argv.includes("--remove");

connectDB()
  .then(() => (remove ? removeDemo() : seed()))
  .catch((error) => {
    console.error("Demo seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
