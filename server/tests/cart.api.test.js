// Cart API tests (guest cart identified by an httpOnly cookie).
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");
const Product = require("../models/Product");
const categoryService = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

// A tiny "browser" that remembers the cart cookie.
function createClient() {
  let cookie = "";
  return {
    async request(method, path, body) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return { status: response.status, body: await response.json(), setCookie };
    },
  };
}

let products;
async function seed() {
  const food = await categoryService.createCategory({ name: "Food" });
  const hidden = await categoryService.createCategory({ name: "Hidden", isPublished: false });
  products = {
    rice: await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 100, discountPrice: 80, stock: 5 }),
    milk: await Product.create({ name: "Milk", slug: "milk", category: food._id, price: 90, stock: 10 }),
    soldOut: await Product.create({ name: "Mango", slug: "mango", category: food._id, price: 50, stock: 0 }),
    draft: await Product.create({ name: "Draft", slug: "draft", category: food._id, price: 10, stock: 9, isPublished: false }),
    secret: await Product.create({ name: "Secret", slug: "secret", category: hidden._id, price: 10, stock: 9 }),
  };
}

describe("Cart API", () => {
  before(async () => {
    await connectTestDB();
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}/api/cart`;
  });
  after(async () => {
    server.close();
    await disconnectTestDB();
  });
  beforeEach(async () => {
    await clearTestDB();
    await seed();
  });

  it("starts empty without creating a cart", async () => {
    const { status, body, setCookie } = await createClient().request("GET", "");
    assert.equal(status, 200);
    assert.deepEqual(body.data, { items: [], count: 0, subtotal: 0, notices: [] });
    assert.equal(setCookie, null);
  });

  it("adds items, sets an httpOnly cookie and uses server prices", async () => {
    const client = createClient();
    const first = await client.request("POST", "/items", { productId: products.rice._id, quantity: 2 });
    assert.equal(first.status, 201);
    assert.match(first.setCookie, /cart_token=.+HttpOnly/i);

    // a price sent by the browser is ignored
    const second = await client.request("POST", "/items", { productId: products.milk._id, quantity: 1, price: 1 });
    assert.equal(second.body.data.count, 3);
    assert.equal(second.body.data.subtotal, 2 * 80 + 90);

    // the cookie keeps the same cart
    const { body } = await client.request("GET", "");
    assert.deepEqual(body.data.items.map((i) => [i.name, i.quantity, i.lineTotal]), [
      ["Rice", 2, 160],
      ["Milk", 1, 90],
    ]);
  });

  it("adding the same product again increases its quantity", async () => {
    const client = createClient();
    await client.request("POST", "/items", { productId: products.rice._id });
    const { body } = await client.request("POST", "/items", { productId: products.rice._id });
    assert.equal(body.data.items.length, 1);
    assert.equal(body.data.items[0].quantity, 2);
  });

  it("never allows more than the stock", async () => {
    const client = createClient();
    await client.request("POST", "/items", { productId: products.rice._id, quantity: 5 });
    const tooMany = await client.request("POST", "/items", { productId: products.rice._id, quantity: 1 });
    assert.equal(tooMany.status, 409);

    const patch = await client.request("PATCH", `/items/${products.rice._id}`, { quantity: 6 });
    assert.equal(patch.status, 409);
  });

  it("rejects unavailable products and bad input", async () => {
    const client = createClient();
    assert.equal((await client.request("POST", "/items", { productId: products.soldOut._id })).status, 409);
    assert.equal((await client.request("POST", "/items", { productId: products.draft._id })).status, 404);
    assert.equal((await client.request("POST", "/items", { productId: products.secret._id })).status, 404);
    assert.equal((await client.request("POST", "/items", { productId: "abc" })).status, 400);
    assert.equal((await client.request("POST", "/items", { productId: products.milk._id, quantity: 0 })).status, 400);
    assert.equal((await client.request("POST", "/items", { productId: products.milk._id, quantity: 1.5 })).status, 400);
    assert.equal((await client.request("POST", "/items", { productId: { $ne: null } })).status, 400);
  });

  it("changes quantity, removes items and clears the cart", async () => {
    const client = createClient();
    await client.request("POST", "/items", { productId: products.rice._id, quantity: 2 });
    await client.request("POST", "/items", { productId: products.milk._id, quantity: 2 });

    let res = await client.request("PATCH", `/items/${products.rice._id}`, { quantity: 1 });
    assert.equal(res.body.data.count, 3);

    res = await client.request("PATCH", `/items/${products.rice._id}`, { quantity: 0 });
    assert.deepEqual(res.body.data.items.map((i) => i.name), ["Milk"]);

    res = await client.request("DELETE", `/items/${products.milk._id}`);
    assert.equal(res.body.data.count, 0);

    await client.request("POST", "/items", { productId: products.milk._id });
    res = await client.request("DELETE", "");
    assert.equal(res.body.data.items.length, 0);
  });

  it("cleans up items that changed after they were added", async () => {
    const client = createClient();
    await client.request("POST", "/items", { productId: products.rice._id, quantity: 4 });
    await client.request("POST", "/items", { productId: products.milk._id, quantity: 1 });

    await Product.updateOne({ _id: products.rice._id }, { stock: 2, discountPrice: null });
    await Product.updateOne({ _id: products.milk._id }, { isPublished: false });

    const { body } = await client.request("GET", "");
    assert.deepEqual(body.data.items.map((i) => [i.name, i.quantity, i.lineTotal]), [["Rice", 2, 200]]);
    assert.equal(body.data.notices.length, 2);

    // the cleanup was saved
    const again = await client.request("GET", "");
    assert.equal(again.body.data.notices.length, 0);
  });

  it("blocks changes without the security header (CSRF protection)", async () => {
    const response = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: products.rice._id }),
    });
    assert.equal(response.status, 403);
  });

  it("two browsers have separate carts", async () => {
    const a = createClient();
    const b = createClient();
    await a.request("POST", "/items", { productId: products.rice._id });
    const { body } = await b.request("GET", "");
    assert.equal(body.data.count, 0);
  });
});
