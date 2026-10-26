/*
 * One-time helper: inserts the 14 main categories from the original
 * Nexora Food website into MongoDB.
 *
 * After this runs, these categories are ordinary database records:
 * the admin dashboard can rename, hide, move or delete any of them.
 * Running it again is safe - categories that already exist are skipped.
 *
 * Usage (from the server folder):  npm.cmd run seed:categories
 */
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/Category");
const { createCategory } = require("../services/category.service");

const MAIN_CATEGORIES = [
  "Fruits & Vegetables",
  "Meat & Fish",
  "Rice, Dal & Grains",
  "Dairy & Eggs",
  "Bakery & Snacks",
  "Beverages",
  "Cooking Essentials",
  "Frozen Food",
  "Sweets & Desserts",
  "Canned & Packaged Food",
  "Spices, Sauces & Seasonings",
  "Nuts & Dry Fruits",
  "Baby Food",
  "Organic",
];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run() {
  await connectDB();
  let created = 0;
  let skipped = 0;

  for (const name of MAIN_CATEGORIES) {
    const exists = await Category.exists({
      parentCategory: null,
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (exists) {
      console.log(`  skip     ${name} (already exists)`);
      skipped += 1;
      continue;
    }
    const category = await createCategory({ name });
    console.log(`  created  ${name}  ->  /${category.slug}`);
    created += 1;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

run()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
