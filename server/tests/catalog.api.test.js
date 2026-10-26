// Tests the public catalog API through real HTTP requests.
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");
const Product = require("../models/Product");
const categoryService = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

async function get(path) {
  const response = await fetch(baseUrl + path);
  return { status: response.status, body: await response.json() };
}

let n = 0;
function product(category, extra = {}) {
  n += 1;
  return Product.create({
    name: extra.name || `Item ${n}`,
    slug: extra.slug || `item-${n}`,
    category: category._id,
    price: 100,
    stock: 5,
    ...extra,
  });
}

// Food > Fruits > Local   and   Food > Vegetables
async function seedCatalog() {
  const food = await categoryService.createCategory({ name: "Food" });
  const fruits = await categoryService.createCategory({ name: "Fruits", parentCategory: food._id });
  const local = await categoryService.createCategory({ name: "Local", parentCategory: fruits._id });
  const vegetables = await categoryService.createCategory({ name: "Vegetables", parentCategory: food._id });

  await product(food, { name: "Rice", slug: "rice", price: 75, soldCount: 90, isFeatured: true });
  await product(fruits, { name: "Apple", slug: "apple", price: 220, discountPrice: 200, soldCount: 20 });
  await product(local, { name: "Banana", slug: "banana", price: 80, soldCount: 30, isFeatured: true });
  await product(local, { name: "Mango", slug: "mango", price: 180, stock: 0, soldCount: 120 });
  await product(vegetables, { name: "Potato", slug: "potato", price: 40, soldCount: 0 });
  await product(vegetables, { name: "Hidden Onion", slug: "hidden-onion", price: 60, isPublished: false });
  return { food, fruits, local, vegetables };
}

const names = (items) => items.map((p) => p.name);

describe("Catalog API", () => {
  before(async () => {
    await connectTestDB();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(async () => {
    server.close();
    await disconnectTestDB();
  });
  beforeEach(clearTestDB);

  it("GET /categories/tree returns the nested tree with counts", async () => {
    await seedCatalog();
    const { status, body } = await get("/categories/tree");
    assert.equal(status, 200);
    const [food] = body.data;
    assert.equal(food.name, "Food");
    assert.equal(food.totalProductCount, 5); // unpublished product not counted
    assert.deepEqual(food.children.map((c) => c.name), ["Fruits", "Vegetables"]);
    assert.equal(food.children[0].children[0].name, "Local");
  });

  it("GET /categories/:slug returns breadcrumb or 404", async () => {
    await seedCatalog();
    const ok = await get("/categories/local");
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.data.breadcrumb.map((b) => b.name), ["Food", "Fruits"]);
    assert.equal((await get("/categories/does-not-exist")).status, 404);
  });

  it("lists only published products from visible categories", async () => {
    const { fruits } = await seedCatalog();
    let { body } = await get("/products?limit=48");
    assert.equal(body.pagination.total, 5);
    assert.ok(!names(body.data).includes("Hidden Onion"));

    await categoryService.updateCategory(fruits._id, { isPublished: false });
    ({ body } = await get("/products?limit=48"));
    assert.deepEqual(names(body.data).sort(), ["Potato", "Rice"]);
  });

  it("filters by category in aggregate and direct mode", async () => {
    await seedCatalog();
    const all = await get("/products?category=fruits&sort=name-asc");
    assert.deepEqual(names(all.body.data), ["Apple", "Banana", "Mango"]);

    const direct = await get("/products?category=fruits&mode=direct");
    assert.deepEqual(names(direct.body.data), ["Apple"]);

    const root = await get("/products?category=food&mode=direct");
    assert.deepEqual(names(root.body.data), ["Rice"]);
  });

  it("searches, filters by final price and stock, and sorts", async () => {
    await seedCatalog();
    assert.deepEqual(names((await get("/products?search=BAN")).body.data), ["Banana"]);

    // Apple costs 220 but its final (discounted) price is 200
    const price = await get("/products?minPrice=190&maxPrice=210");
    assert.deepEqual(names(price.body.data), ["Apple"]);

    const inStock = await get("/products?category=local&inStock=true");
    assert.deepEqual(names(inStock.body.data), ["Banana"]);

    const cheap = await get("/products?sort=price-asc");
    assert.deepEqual(names(cheap.body.data), ["Potato", "Rice", "Banana", "Mango", "Apple"]);

    const apple = cheap.body.data.find((p) => p.name === "Apple");
    assert.equal(apple.finalPrice, 200);
    assert.equal(apple.hasDiscount, true);
    assert.equal(apple.costPrice, undefined);
  });

  it("paginates without losing filters", async () => {
    await seedCatalog();
    const page2 = await get("/products?sort=name-asc&limit=2&page=2");
    assert.deepEqual(names(page2.body.data), ["Mango", "Potato"]);
    assert.deepEqual(page2.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 });
    assert.equal(page2.body.filters.sort, "name-asc");
  });

  it("rejects invalid query parameters with 400", async () => {
    for (const query of [
      "sort=cheapest",
      "page=0",
      "limit=500",
      "minPrice=-5",
      "minPrice=100&maxPrice=50",
      "inStock=maybe",
      "mode=deep",
      "sort=price-asc&sort=name-asc",
      "category=$ne",
    ]) {
      const { status } = await get(`/products?${query}`);
      assert.equal(status, 400, `expected 400 for ?${query}`);
    }
  });

  it("GET /products/:slug returns details, breadcrumb and related; hides unpublished", async () => {
    await seedCatalog();
    const { status, body } = await get("/products/banana");
    assert.equal(status, 200);
    assert.equal(body.data.product.name, "Banana");
    assert.deepEqual(body.data.breadcrumb.map((b) => b.name), ["Food", "Fruits", "Local"]);
    assert.deepEqual(names(body.data.related), ["Mango"]);

    assert.equal((await get("/products/hidden-onion")).status, 404);
    assert.equal((await get("/products/nope")).status, 404);
  });

  it("GET /home returns featured and popular without duplicates", async () => {
    await seedCatalog();
    const { body } = await get("/home");
    assert.deepEqual(names(body.data.featured).sort(), ["Banana", "Rice"]);
    // popular = best sellers (soldCount > 0) that are not already featured
    assert.deepEqual(names(body.data.popular), ["Mango", "Apple"]);
  });
});
