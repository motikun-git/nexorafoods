const mongoose = require("mongoose");
const { MAX_CATEGORY_DEPTH } = require("../config/constants");

const { Schema } = mongoose;

/*
 * One document per category. The tree is built from parent references,
 * so categories can be nested to any (practical) depth.
 *
 * Extra fields (beyond the basic spec):
 *  - ancestors: ids of ALL parents, from the root down to the direct parent.
 *      Lets us find a whole branch, build breadcrumbs and block circular
 *      moves with a single query instead of walking the tree in a loop.
 *  - depth: 0 for a root category, 1 for its children, ...
 *      Equal to ancestors.length; used to enforce MAX_CATEGORY_DEPTH.
 *  - isDemo: marks demonstration data so it can be removed with one command.
 */
const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Category name must be at most 80 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only a-z, 0-9 and hyphens"],
    },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    image: { type: String, trim: true, maxlength: 500, default: "" },
    parentCategory: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    ancestors: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    depth: { type: Number, default: 0, min: 0, max: MAX_CATEGORY_DEPTH },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ parentCategory: 1, sortOrder: 1 });
categorySchema.index({ ancestors: 1 });

module.exports = mongoose.model("Category", categorySchema);
