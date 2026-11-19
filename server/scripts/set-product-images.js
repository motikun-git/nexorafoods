/*
 * Gives a picture to every product that has none, using the ready-made
 * images in client/public/images/products/<product-slug>.webp
 * Products that already have images are never changed.
 *
 *   npm.cmd run set-product-images
 *
 * Your server/.env decides which database is changed (the online site uses
 * the same database).
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");

const IMAGE_DIR = path.join(__dirname, "..", "..", "client", "public", "images", "products");

async function run() {
  await connectDB();
  const productsWithoutImages = await Product.find({ $or: [{ images: { $exists: false } }, { images: { $size: 0 } }] });

  const updatedNames = [];
  const stillMissingNames = [];
  for (const product of productsWithoutImages) {
    const fileName = `${product.slug}.webp`;
    if (fs.existsSync(path.join(IMAGE_DIR, fileName))) {
      await Product.updateOne({ _id: product._id }, { $set: { images: [`/images/products/${fileName}`] } });
      updatedNames.push(product.name);
    } else {
      stillMissingNames.push(product.name);
    }
  }

  console.log(`Pictures added: ${updatedNames.length}`);
  if (updatedNames.length) console.log("  " + updatedNames.join(", "));
  if (stillMissingNames.length) {
    console.log(`No ready-made picture for: ${stillMissingNames.join(", ")}`);
    console.log("  Upload these from Admin -> Products.");
  }
}

run()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
