// Admin API tests: permissions, categories, products, orders, settings, uploads.
process.env.AUTH_RATE_LIMIT = "1000";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const categoryService = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

function createClient() {
  const cookies = new Map();
  return {
    async request(method, path, body, { raw = false, noHeader = false } = {}) {
      const headers = {
        ...(noHeader ? {} : { "X-Requested-With": "fetch" }),
        ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      };
      if (!raw) headers["Content-Type"] = "application/json";
      const response = await fetch(baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
      });
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(";");
        const [name, value] = pair.split("=");
        if (value) cookies.set(name, value);
        else cookies.delete(name);
      }
      return { status: response.status, body: await response.json() };
    },
  };
}

let n = 0;
async function account({ admin = false } = {}) {
  n += 1;
  const client = createClient();
  const email = `user${n}@example.com`;
  await client.request("POST", "/auth/register", {
    name: `User ${n}`,
    email,
    phone: `018${String(10000000 + n).slice(-8)}`,
    password: "secret123",
  });
  if (admin) {
    await User.updateOne({ email }, { role: "admin" });
  }
  return client;
}

let food;
let admin;

describe("Admin API", () => {
  before(async () => {
    await connectTestDB();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(async () => {
    server.close();
    await disconnectTestDB();
  });
  beforeEach(async () => {
    await clearTestDB();
    food = await categoryService.createCategory({ name: "Food" });
    admin = await account({ admin: true });
  });

  it("is closed to guests (401) and customers (403)", async () => {
    assert.equal((await createClient().request("GET", "/admin/summary")).status, 401);
    const customer = await account();
    for (const [method, path] of [
      ["GET", "/admin/summary"],
      ["GET", "/admin/products"],
      ["POST", "/admin/products"],
      ["GET", "/admin/orders"],
      ["PATCH", "/admin/settings"],
      ["POST", "/admin/categories"],
    ]) {
      assert.equal((await customer.request(method, path, method === "GET" ? undefined : {})).status, 403, `${method} ${path}`);
    }
  });

  it("manages nested categories", async () => {
    const created = await admin.request("POST", "/admin/categories", { name: "Fruits", parentCategory: String(food._id) });
    assert.equal(created.status, 201);
    const fruitsId = created.body.data._id;

    const renamed = await admin.request("PATCH", `/admin/categories/${fruitsId}`, { name: "Fresh Fruits", isPublished: false });
    assert.equal(renamed.body.data.name, "Fresh Fruits");

    const moved = await admin.request("PATCH", `/admin/categories/${fruitsId}/move`, { parentCategory: null });
    assert.equal(moved.body.data.parentCategory, null);

    const list = await admin.request("GET", "/admin/categories");
    assert.equal(list.body.data.total, 2);

    await Product.create({ name: "Apple", slug: "apple", category: fruitsId, price: 10, stock: 1 });
    assert.equal((await admin.request("DELETE", `/admin/categories/${fruitsId}`)).status, 409);
    const removed = await admin.request("DELETE", `/admin/categories/${fruitsId}`, { moveProductsTo: String(food._id) });
    assert.equal(removed.body.data.movedProducts, 1);
  });

  it("creates and edits products with validation", async () => {
    const created = await admin.request("POST", "/admin/products", {
      name: "Fresh Milk",
      category: String(food._id),
      price: 100,
      discountPrice: 90,
      costPrice: 70,
      stock: 12,
      unit: "litre",
      isFeatured: true,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.slug, "fresh-milk");
    assert.equal(created.body.data.category.name, "Food");

    // the same name gets a different link name
    const twin = await admin.request("POST", "/admin/products", { name: "Fresh Milk", category: String(food._id), price: 5 });
    assert.equal(twin.body.data.slug, "fresh-milk-2");

    const id = created.body.data._id;
    const edited = await admin.request("PATCH", `/admin/products/${id}`, { stock: 3, isPublished: false });
    assert.equal(edited.body.data.stock, 3);
    assert.equal(edited.body.data.isPublished, false);

    for (const bad of [
      { discountPrice: 150 }, // more than the price
      { price: -1 },
      { stock: 1.5 },
      { category: "not-an-id" },
      { images: ["javascript:alert(1)"] },
      { name: "" },
    ]) {
      assert.equal((await admin.request("PATCH", `/admin/products/${id}`, bad)).status, 400, JSON.stringify(bad));
    }
    assert.equal((await admin.request("POST", "/admin/products", { name: "No price", category: String(food._id) })).status, 400);

    const list = await admin.request("GET", "/admin/products?search=milk");
    assert.equal(list.body.pagination.total, 2);
    const hidden = await admin.request("GET", "/admin/products?status=hidden");
    assert.deepEqual(hidden.body.data.map((p) => p.name), ["Fresh Milk"]);
  });

  it("does not delete products that were ordered", async () => {
    const product = await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 80, stock: 10 });
    const customer = await account();
    await customer.request("POST", "/cart/items", { productId: product._id, quantity: 1 });
    await customer.request("POST", "/orders", {
      shipping: { name: "A B", phone: "01712345678", area: "inside_dhaka", city: "Dhaka", addressLine: "House 1, Road 2" },
      paymentMethod: "cod",
      idempotencyKey: "order-key-001",
    });
    assert.equal((await admin.request("DELETE", `/admin/products/${product._id}`)).status, 409);

    const unused = await Product.create({ name: "Salt", slug: "salt", category: food._id, price: 20, stock: 1 });
    assert.equal((await admin.request("DELETE", `/admin/products/${unused._id}`)).status, 200);
  });

  it("moves orders through allowed statuses only", async () => {
    const product = await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 80, stock: 10 });
    const customer = await account();
    await customer.request("POST", "/cart/items", { productId: product._id, quantity: 2 });
    const placed = await customer.request("POST", "/orders", {
      shipping: { name: "A B", phone: "01712345678", area: "inside_dhaka", city: "Dhaka", addressLine: "House 1, Road 2" },
      paymentMethod: "cod",
      idempotencyKey: "order-key-002",
    });
    const number = placed.body.data.orderNumber;

    const list = await admin.request("GET", "/admin/orders?status=pending");
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.statusCounts.pending, 1);

    // cannot jump straight to delivered
    assert.equal((await admin.request("PATCH", `/admin/orders/${number}/status`, { status: "delivered" })).status, 400);

    for (const status of ["confirmed", "processing", "shipped", "delivered"]) {
      const res = await admin.request("PATCH", `/admin/orders/${number}/status`, { status });
      assert.equal(res.status, 200, status);
    }
    const delivered = await Order.findOne({ orderNumber: number });
    assert.equal(delivered.paymentStatus, "paid");
    assert.equal(delivered.statusHistory.length, 5);

    // a delivered order is final
    assert.equal((await admin.request("PATCH", `/admin/orders/${number}/status`, { status: "cancelled" })).status, 400);

    const summary = await admin.request("GET", "/admin/summary");
    assert.equal(summary.body.data.deliveredRevenue30Days, 160 + 60);
  });

  it("cancelling an order from the admin gives the stock back", async () => {
    const product = await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 80, stock: 10 });
    const customer = await account();
    await customer.request("POST", "/cart/items", { productId: product._id, quantity: 4 });
    const placed = await customer.request("POST", "/orders", {
      shipping: { name: "A B", phone: "01712345678", area: "inside_dhaka", city: "Dhaka", addressLine: "House 1, Road 2" },
      paymentMethod: "cod",
      idempotencyKey: "order-key-003",
    });
    assert.equal((await Product.findById(product._id)).stock, 6);
    await admin.request("PATCH", `/admin/orders/${placed.body.data.orderNumber}/status`, { status: "cancelled", note: "Customer called" });
    assert.equal((await Product.findById(product._id)).stock, 10);
  });

  it("updates store settings with validation", async () => {
    const updated = await admin.request("PATCH", "/admin/settings", {
      storeName: "Fresh Mart",
      colors: { primary: "#1E40AF" },
      delivery: { insideDhaka: 70 },
      role: "admin", // unknown fields are ignored
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.storeName, "Fresh Mart");
    assert.equal(updated.body.data.colors.primary, "#1E40AF");
    assert.equal(updated.body.data.colors.accent, "#F28C38"); // untouched default kept
    assert.equal(updated.body.data.delivery.insideDhaka, 70);

    const publicSettings = await createClient().request("GET", "/settings");
    assert.equal(publicSettings.body.data.storeName, "Fresh Mart");

    for (const bad of [{ colors: { primary: "red" } }, { storeName: "" }, { delivery: { outsideDhaka: -5 } }, { contact: { website: "javascript:x" } }]) {
      assert.equal((await admin.request("PATCH", "/admin/settings", bad)).status, 400, JSON.stringify(bad));
    }
  });

  it("accepts real images only for upload", async () => {
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
      "hex"
    );
    const good = new FormData();
    good.append("image", new Blob([png], { type: "image/png" }), "pixel.png");
    const ok = await admin.request("POST", "/admin/uploads", good, { raw: true });
    assert.equal(ok.status, 201);
    assert.match(ok.body.data.url, /^\/uploads\/products\/[a-f0-9]{32}\.png$/);

    const fake = new FormData();
    fake.append("image", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "evil.png");
    assert.equal((await admin.request("POST", "/admin/uploads", fake, { raw: true })).status, 400);

    const customer = await account();
    assert.equal((await customer.request("POST", "/admin/uploads", good, { raw: true })).status, 403);
  });
});
