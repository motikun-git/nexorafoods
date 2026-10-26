const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
 * A product belongs DIRECTLY to exactly one category, which may be a root,
 * an intermediate or a leaf category. Because each product has one category,
 * "category + all its subcategories" queries never return duplicates.
 *
 * Prices are stored in the store's currency (BDT for Nexora Food).
 */
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [150, "Product name must be at most 150 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only a-z, 0-9 and hyphens"],
    },
    sku: { type: String, trim: true, uppercase: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    images: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: [(arr) => arr.length <= 8, "A product can have at most 8 images"],
    },
    unit: { type: String, trim: true, maxlength: 30, default: "pcs" }, // kg, dozen, litre...
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      default: null,
    },
    costPrice: { type: Number, min: 0, default: null }, // for profit reports (admin only)
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
      validate: [Number.isInteger, "Stock must be a whole number"],
    },
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0, min: 0 }, // used for "Popular products"
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A discount must be lower than the regular price.
productSchema.pre("validate", function () {
  if (this.discountPrice != null && this.price != null && this.discountPrice >= this.price) {
    this.invalidate("discountPrice", "Discount price must be lower than the regular price");
  }
});

productSchema.virtual("hasDiscount").get(function () {
  return this.discountPrice != null && this.discountPrice < this.price;
});

// The price the customer actually pays.
productSchema.virtual("finalPrice").get(function () {
  return this.hasDiscount ? this.discountPrice : this.price;
});

productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

productSchema.index({ category: 1, isPublished: 1 });
productSchema.index({ isPublished: 1, isFeatured: 1 });
productSchema.index({ isPublished: 1, soldCount: -1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Product", productSchema);
