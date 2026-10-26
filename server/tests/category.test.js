// Run with:  npm.cmd test   (from the server folder)
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const Category = require("../models/Category");
const Product = require("../models/Product");
const service = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

const status = (code) => (err) => {
  assert.equal(err.statusCode, code, `expected HTTP ${code}, got ${err.statusCode}: ${err.message}`);
  return true;
};

let productNo = 0;
function addProduct(category, extra = {}) {
  productNo += 1;
  return Product.create({
    name: `Product ${productNo}`,
    slug: `product-${productNo}`,
    category: category._id,
    price: 100,
    stock: 10,
    ...extra,
  });
}

// Fruits & Vegetables > Fruits > Local Fruits > Seasonal Fruits
//                     > Vegetables
async function buildSampleTree() {
  const root = await service.createCategory({ name: "Fruits & Vegetables" });
  const fruits = await service.createCategory({ name: "Fruits", parentCategory: root._id });
  const local = await service.createCategory({ name: "Local Fruits", parentCategory: fruits._id });
  const seasonal = await service.createCategory({ name: "Seasonal Fruits", parentCategory: local._id });
  const vegetables = await service.createCategory({ name: "Vegetables", parentCategory: root._id });
  return { root, fruits, local, seasonal, vegetables };
}

const reload = (doc) => Category.findById(doc._id);
const ids = (list) => list.map((x) => String(x));

describe("Category system", () => {
  before(connectTestDB);
  after(disconnectTestDB);
  beforeEach(clearTestDB);

  describe("creating nested categories", () => {
    it("stores parent, ancestors and depth at any level", async () => {
      const { root, fruits, local, seasonal } = await buildSampleTree();

      assert.equal(root.parentCategory, null);
      assert.equal(root.depth, 0);
      assert.equal(String(seasonal.parentCategory), String(local._id));
      assert.equal(seasonal.depth, 3);
      assert.deepEqual(ids(seasonal.ancestors), ids([root._id, fruits._id, local._id]));
    });

    it("creates readable, unique slugs even for duplicate names", async () => {
      const { fruits, vegetables } = await buildSampleTree();
      const a = await service.createCategory({ name: "Organic", parentCategory: fruits._id });
      const b = await service.createCategory({ name: "Organic", parentCategory: vegetables._id });
      const c = await service.createCategory({ name: "Organic", parentCategory: vegetables._id });

      assert.equal(a.slug, "organic");
      assert.equal(b.slug, "vegetables-organic");
      assert.equal(c.slug, "vegetables-organic-2");
    });

    it("keeps the slug when the name changes", async () => {
      const { fruits } = await buildSampleTree();
      const updated = await service.updateCategory(fruits._id, { name: "Fresh Fruits" });
      assert.equal(updated.name, "Fresh Fruits");
      assert.equal(updated.slug, "fruits");
    });

    it("rejects a missing or invalid parent", async () => {
      await assert.rejects(
        service.createCategory({ name: "X", parentCategory: "64b000000000000000000000" }),
        status(400)
      );
      await assert.rejects(service.createCategory({ name: "X", parentCategory: "abc" }), status(400));
      await assert.rejects(service.createCategory({ name: "  " }), status(400));
    });

    it("enforces the maximum depth", async () => {
      let parent = null;
      for (let level = 1; level <= 10; level++) {
        parent = await service.createCategory({ name: `Level ${level}`, parentCategory: parent?._id });
      }
      await assert.rejects(
        service.createCategory({ name: "Level 11", parentCategory: parent._id }),
        status(400)
      );
    });
  });

  describe("moving categories", () => {
    it("moves a whole branch and rewrites every descendant's path", async () => {
      const { root, fruits, local, seasonal, vegetables } = await buildSampleTree();
      await service.moveCategory(fruits._id, vegetables._id);

      const movedLocal = await reload(local);
      const movedSeasonal = await reload(seasonal);
      assert.deepEqual(ids(movedLocal.ancestors), ids([root._id, vegetables._id, fruits._id]));
      assert.equal(movedLocal.depth, 3);
      assert.deepEqual(
        ids(movedSeasonal.ancestors),
        ids([root._id, vegetables._id, fruits._id, local._id])
      );
      assert.equal(movedSeasonal.depth, 4);
    });

    it("can move a category to the top level", async () => {
      const { local, seasonal } = await buildSampleTree();
      await service.moveCategory(local._id, null);

      const movedLocal = await reload(local);
      assert.equal(movedLocal.parentCategory, null);
      assert.equal(movedLocal.depth, 0);
      assert.deepEqual(ids((await reload(seasonal)).ancestors), ids([local._id]));
    });

    it("blocks circular moves", async () => {
      const { root, fruits, seasonal } = await buildSampleTree();
      await assert.rejects(service.moveCategory(fruits._id, fruits._id), status(400));
      await assert.rejects(service.moveCategory(root._id, seasonal._id), status(400));
      await assert.rejects(service.moveCategory(fruits._id, "64b000000000000000000000"), status(400));

      // nothing changed
      assert.equal((await reload(root)).parentCategory, null);
    });

    it("does not allow changing the parent through a normal update", async () => {
      const { fruits, vegetables } = await buildSampleTree();
      await assert.rejects(
        service.updateCategory(fruits._id, { parentCategory: vegetables._id }),
        status(400)
      );
    });

    it("reorders siblings only", async () => {
      const { root, fruits, vegetables, local } = await buildSampleTree();
      await service.reorderCategories([
        { id: String(vegetables._id), sortOrder: 0 },
        { id: String(fruits._id), sortOrder: 1 },
      ]);
      const tree = await service.getPublicTree();
      assert.deepEqual(tree[0].children.map((c) => c.name), ["Vegetables", "Fruits"]);

      await assert.rejects(
        service.reorderCategories([
          { id: String(root._id), sortOrder: 0 },
          { id: String(local._id), sortOrder: 1 },
        ]),
        status(400)
      );
    });
  });

  describe("products at every level", () => {
    it("counts direct and aggregate (branch) products", async () => {
      const { root, fruits, local, seasonal } = await buildSampleTree();
      await addProduct(root);
      await addProduct(fruits);
      await addProduct(fruits);
      await addProduct(local);
      await addProduct(seasonal);

      const [rootNode] = await service.getPublicTree();
      const fruitsNode = rootNode.children.find((c) => c.name === "Fruits");

      assert.equal(rootNode.directProductCount, 1);
      assert.equal(rootNode.totalProductCount, 5);
      assert.equal(fruitsNode.directProductCount, 2);
      assert.equal(fruitsNode.totalProductCount, 4);
    });

    it("returns the right category ids for direct and aggregate modes", async () => {
      const { fruits, local, seasonal } = await buildSampleTree();

      const direct = await service.getVisibleCategoryIdsFor(fruits._id, "direct");
      assert.deepEqual(ids(direct), ids([fruits._id]));

      const all = await service.getVisibleCategoryIdsFor(fruits._id, "all");
      assert.deepEqual(new Set(ids(all)), new Set(ids([fruits._id, local._id, seasonal._id])));
    });
  });

  describe("publication rules", () => {
    it("hides a whole branch when a parent is unpublished, and restores it", async () => {
      const { fruits, local, seasonal } = await buildSampleTree();
      await service.updateCategory(fruits._id, { isPublished: false });

      const tree = await service.getPublicTree();
      assert.deepEqual(tree[0].children.map((c) => c.name), ["Vegetables"]);
      await assert.rejects(service.getPublicCategoryBySlug(seasonal.slug), status(404));
      await assert.rejects(service.getVisibleCategoryIdsFor(local._id), status(404));

      // children kept their own setting
      assert.equal((await reload(local)).isPublished, true);

      await service.updateCategory(fruits._id, { isPublished: true });
      const { breadcrumb } = await service.getPublicCategoryBySlug(seasonal.slug);
      assert.deepEqual(breadcrumb.map((b) => b.name), ["Fruits & Vegetables", "Fruits", "Local Fruits"]);
    });

    it("still shows hidden categories to the admin", async () => {
      const { fruits } = await buildSampleTree();
      await service.updateCategory(fruits._id, { isPublished: false });

      const { tree } = await service.getAdminCategories();
      const fruitsNode = tree[0].children.find((c) => c.name === "Fruits");
      assert.equal(fruitsNode.isVisible, false);
      assert.equal(fruitsNode.children[0].isVisible, false);
    });
  });

  describe("safe deletion", () => {
    it("deletes an empty category", async () => {
      const { seasonal } = await buildSampleTree();
      await service.deleteCategory(seasonal._id);
      assert.equal(await Category.exists({ _id: seasonal._id }), null);
    });

    it("refuses to delete a non-empty category without instructions", async () => {
      const { fruits } = await buildSampleTree();
      await addProduct(fruits);

      await assert.rejects(service.deleteCategory(fruits._id), (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.details.childCount, 1);
        assert.equal(err.details.productCount, 1);
        return true;
      });
      assert.ok(await Category.exists({ _id: fruits._id }));
    });

    it("moves products and subcategories, then deletes", async () => {
      const { root, fruits, local, seasonal, vegetables } = await buildSampleTree();
      const product = await addProduct(fruits);

      const result = await service.deleteCategory(fruits._id, {
        moveProductsTo: String(vegetables._id),
        moveChildrenTo: String(root._id),
      });
      assert.deepEqual(result, { deleted: true, movedProducts: 1, movedSubcategories: 1 });

      assert.equal(String((await Product.findById(product._id)).category), String(vegetables._id));
      const movedLocal = await reload(local);
      assert.equal(String(movedLocal.parentCategory), String(root._id));
      assert.deepEqual(ids((await reload(seasonal)).ancestors), ids([root._id, local._id]));
    });

    it("can move subcategories to the top level when deleting", async () => {
      const { fruits, local } = await buildSampleTree();
      await service.deleteCategory(fruits._id, { moveChildrenTo: null });
      assert.equal((await reload(local)).parentCategory, null);
    });

    it("never moves things into the category being deleted", async () => {
      const { fruits, local, seasonal } = await buildSampleTree();
      await addProduct(fruits);

      await assert.rejects(
        service.deleteCategory(fruits._id, {
          moveProductsTo: String(fruits._id),
          moveChildrenTo: null,
        }),
        status(400)
      );
      await assert.rejects(
        service.deleteCategory(fruits._id, {
          moveProductsTo: String(local._id),
          moveChildrenTo: String(seasonal._id),
        }),
        status(400)
      );
      // transaction rolled back: nothing changed
      assert.ok(await Category.exists({ _id: fruits._id }));
      assert.equal(await Product.countDocuments({ category: fruits._id }), 1);
    });
  });
});
