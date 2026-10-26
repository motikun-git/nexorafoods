// Checkout / order tests.
process.env.AUTH_RATE_LIMIT = "1000";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");
const Order = require("../models/Order");
const Product = require("../models/Product");
const categoryService = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

function createClient() {
  const cookies = new Map();
  return {
    async request(method, path, body) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
          ...(cookies.size ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
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
async function customer() {
  n += 1;
  const client = createClient();
  await client.request("POST", "/auth/register", {
    name: `Customer ${n}`,
    email: `c${n}@example.com`,
    phone: `017${String(10000000 + n).slice(-8)}`,
    password: "secret123",
  });
  return client;
}

const SHIPPING = {
  name: "Rahim Uddin",
  phone: "01712345678",
  area: "inside_dhaka",
  city: "Dhaka",
  addressLine: "House 5, Road 9, Mirpur DOHS",
  note: "Call before coming",
};

let products;

const order = (client, extra = {}) =>
  client.request("POST", "/orders", {
    shipping: SHIPPING,
    paymentMethod: "cod",
    idempotencyKey: `key-${Math.random().toString(36).slice(2, 12)}`,
    ...extra,
  });

describe("Orders API", () => {
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
    const food = await categoryService.createCategory({ name: "Food" });
    products = {
      rice: await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 100, discountPrice: 80, stock: 5 }),
      milk: await Product.create({ name: "Milk", slug: "milk", category: food._id, price: 90, stock: 10 }),
    };
  });

  it("requires login", async () => {
    const { status } = await order(createClient());
    assert.equal(status, 401);
  });

  it("refuses an empty cart", async () => {
    const { status, body } = await order(await customer());
    assert.equal(status, 400);
    assert.match(body.message, /empty/i);
  });

  it("places an order: server totals, stock reduced, cart emptied", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.rice._id, quantity: 2 });
    await client.request("POST", "/cart/items", { productId: products.milk._id, quantity: 1 });

    const { status, body } = await order(client, { total: 1, subtotal: 1 }); // browser totals are ignored
    assert.equal(status, 201);
    const placed = body.data;
    assert.match(placed.orderNumber, /^NF-\d{6}-[A-Z0-9]{4}$/);
    assert.equal(placed.subtotal, 2 * 80 + 90);
    assert.equal(placed.deliveryCharge, 60);
    assert.equal(placed.total, 250 + 60);
    assert.equal(placed.status, "pending");
    assert.equal(placed.paymentMethod, "cod");
    assert.equal(placed.idempotencyKey, undefined);
    assert.deepEqual(placed.items.map((i) => [i.name, i.quantity, i.finalPrice]), [
      ["Rice", 2, 80],
      ["Milk", 1, 90],
    ]);

    const rice = await Product.findById(products.rice._id);
    assert.equal(rice.stock, 3);
    assert.equal(rice.soldCount, 2);
    assert.equal((await client.request("GET", "/cart")).body.data.count, 0);
  });

  it("charges outside-Dhaka delivery", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.milk._id, quantity: 1 });
    const { body } = await order(client, { shipping: { ...SHIPPING, area: "outside_dhaka" } });
    assert.equal(body.data.deliveryCharge, 120);
  });

  it("keeps the order snapshot when the product changes later", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.milk._id, quantity: 1 });
    const { body } = await order(client);
    await Product.updateOne({ _id: products.milk._id }, { name: "Renamed", price: 999 });

    const again = await client.request("GET", `/orders/${body.data.orderNumber}`);
    assert.equal(again.body.data.items[0].name, "Milk");
    assert.equal(again.body.data.items[0].finalPrice, 90);
  });

  it("does not create the same order twice (double click)", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.rice._id, quantity: 1 });
    const first = await order(client, { idempotencyKey: "checkout-abc12345" });
    const second = await order(client, { idempotencyKey: "checkout-abc12345" });
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.orderNumber, first.body.data.orderNumber);
    assert.equal(await Order.countDocuments(), 1);
    assert.equal((await Product.findById(products.rice._id)).stock, 4);
  });

  it("refuses when stock ran out, without changing anything", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.milk._id, quantity: 2 });
    await client.request("POST", "/cart/items", { productId: products.rice._id, quantity: 3 });
    await Product.updateOne({ _id: products.rice._id }, { stock: 1 });

    const { status, body } = await order(client);
    assert.equal(status, 409);
    assert.ok(body.details.problems.length > 0);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Product.findById(products.milk._id)).stock, 10);
  });

  it("only one of two customers gets the last item", async () => {
    await Product.updateOne({ _id: products.rice._id }, { stock: 1 });
    const a = await customer();
    const b = await customer();
    await a.request("POST", "/cart/items", { productId: products.rice._id, quantity: 1 });
    await b.request("POST", "/cart/items", { productId: products.rice._id, quantity: 1 });

    const results = await Promise.all([order(a), order(b)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await Product.findById(products.rice._id)).stock, 0);
    assert.equal(await Order.countDocuments(), 1);
  });

  it("validates the delivery details and payment method", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.milk._id, quantity: 1 });
    for (const shipping of [
      { ...SHIPPING, phone: "123" },
      { ...SHIPPING, area: "mars" },
      { ...SHIPPING, addressLine: "" },
      { ...SHIPPING, name: { $ne: null } },
    ]) {
      assert.equal((await order(client, { shipping })).status, 400, JSON.stringify(shipping));
    }
    assert.equal((await order(client, { paymentMethod: "card" })).status, 400);
    assert.equal((await order(client, { idempotencyKey: "x" })).status, 400);
  });

  it("customers see only their own orders", async () => {
    const owner = await customer();
    await owner.request("POST", "/cart/items", { productId: products.milk._id, quantity: 1 });
    const { body } = await order(owner);

    const list = await owner.request("GET", "/orders");
    assert.equal(list.body.data.length, 1);

    const stranger = await customer();
    assert.equal((await stranger.request("GET", `/orders/${body.data.orderNumber}`)).status, 404);
    assert.equal((await stranger.request("GET", "/orders")).body.data.length, 0);
    assert.equal((await stranger.request("POST", `/orders/${body.data.orderNumber}/cancel`)).status, 404);
  });

  it("cancelling a pending order gives the stock back; later it is not allowed", async () => {
    const client = await customer();
    await client.request("POST", "/cart/items", { productId: products.rice._id, quantity: 2 });
    const { body } = await order(client);
    const number = body.data.orderNumber;

    const cancelled = await client.request("POST", `/orders/${number}/cancel`);
    assert.equal(cancelled.body.data.status, "cancelled");
    const rice = await Product.findById(products.rice._id);
    assert.equal(rice.stock, 5);
    assert.equal(rice.soldCount, 0);

    assert.equal((await client.request("POST", `/orders/${number}/cancel`)).status, 409);
  });
});
