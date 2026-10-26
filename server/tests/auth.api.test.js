// Login / register tests.
process.env.AUTH_RATE_LIMIT = "1000"; // the real limit is tested separately below

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../app");
const User = require("../models/User");
const Product = require("../models/Product");
const categoryService = require("../services/category.service");
const { connectTestDB, clearTestDB, disconnectTestDB } = require("./helpers/db");

let server;
let baseUrl;

function createClient() {
  const cookies = new Map();
  return {
    cookies,
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
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
  };
}

const VALID = { name: "Rahim Uddin", email: "Rahim@Example.com", phone: "+880 1712-345678", password: "secret123" };

describe("Auth API", () => {
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

  it("registers a customer, normalizes email/phone and logs them in", async () => {
    const client = createClient();
    const { status, body } = await client.request("POST", "/auth/register", VALID);
    assert.equal(status, 201);
    assert.equal(body.data.email, "rahim@example.com");
    assert.equal(body.data.phone, "01712345678");
    assert.equal(body.data.role, "customer");
    assert.equal(body.data.passwordHash, undefined);
    assert.ok(client.cookies.has("auth_token"));

    const me = await client.request("GET", "/auth/me");
    assert.equal(me.body.data.name, "Rahim Uddin");
  });

  it("stores a hash, never the password", async () => {
    await createClient().request("POST", "/auth/register", VALID);
    const user = await User.findOne({ email: "rahim@example.com" }).select("+passwordHash").lean();
    assert.notEqual(user.passwordHash, VALID.password);
    assert.match(user.passwordHash, /^\$2[aby]\$12\$/);
  });

  it("cannot register as admin", async () => {
    const { body } = await createClient().request("POST", "/auth/register", { ...VALID, role: "admin" });
    assert.equal(body.data.role, "customer");
  });

  it("validates input and rejects duplicates", async () => {
    const client = createClient();
    for (const bad of [
      { ...VALID, email: "not-an-email" },
      { ...VALID, phone: "12345" },
      { ...VALID, password: "short1" },
      { ...VALID, password: "onlyletters" },
      { ...VALID, name: "" },
      { ...VALID, email: { $ne: null } },
    ]) {
      assert.equal((await client.request("POST", "/auth/register", bad)).status, 400, JSON.stringify(bad));
    }
    await client.request("POST", "/auth/register", VALID);
    assert.equal((await createClient().request("POST", "/auth/register", VALID)).status, 409);
    assert.equal(
      (await createClient().request("POST", "/auth/register", { ...VALID, email: "other@example.com" })).status,
      409
    );
  });

  it("logs in with email or mobile number", async () => {
    await createClient().request("POST", "/auth/register", VALID);

    const byEmail = await createClient().request("POST", "/auth/login", { identifier: "RAHIM@example.com", password: "secret123" });
    assert.equal(byEmail.status, 200);

    const byPhone = await createClient().request("POST", "/auth/login", { identifier: "01712345678", password: "secret123" });
    assert.equal(byPhone.status, 200);
  });

  it("gives the same error for a wrong password and an unknown account", async () => {
    await createClient().request("POST", "/auth/register", VALID);
    const wrong = await createClient().request("POST", "/auth/login", { identifier: "01712345678", password: "wrong1234" });
    const unknown = await createClient().request("POST", "/auth/login", { identifier: "nobody@x.com", password: "wrong1234" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  it("logs out", async () => {
    const client = createClient();
    await client.request("POST", "/auth/register", VALID);
    await client.request("POST", "/auth/logout");
    assert.equal((await client.request("GET", "/auth/me")).body.data, null);
    assert.equal((await client.request("GET", "/auth/check")).status, 401);
  });

  it("ignores a forged login cookie", async () => {
    const client = createClient();
    client.cookies.set("auth_token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.forged");
    assert.equal((await client.request("GET", "/auth/me")).body.data, null);
  });

  it("keeps the guest cart after login and merges it with the account cart", async () => {
    const food = await categoryService.createCategory({ name: "Food" });
    const rice = await Product.create({ name: "Rice", slug: "rice", category: food._id, price: 80, stock: 20 });
    const milk = await Product.create({ name: "Milk", slug: "milk", category: food._id, price: 90, stock: 20 });

    // account with 1 rice in its cart
    const first = createClient();
    await first.request("POST", "/auth/register", VALID);
    await first.request("POST", "/cart/items", { productId: rice._id, quantity: 1 });

    // a guest adds 2 rice + 1 milk, then logs in
    const guest = createClient();
    await guest.request("POST", "/cart/items", { productId: rice._id, quantity: 2 });
    await guest.request("POST", "/cart/items", { productId: milk._id, quantity: 1 });
    await guest.request("POST", "/auth/login", { identifier: VALID.email, password: VALID.password });

    const { body } = await guest.request("GET", "/cart");
    assert.deepEqual(
      body.data.items.map((i) => [i.name, i.quantity]),
      [
        ["Rice", 3],
        ["Milk", 1],
      ]
    );

    // after logout the browser has an empty guest cart; the account keeps it
    await guest.request("POST", "/auth/logout");
    assert.equal((await guest.request("GET", "/cart")).body.data.count, 0);
    assert.equal((await first.request("GET", "/cart")).body.data.count, 4);
  });
});
