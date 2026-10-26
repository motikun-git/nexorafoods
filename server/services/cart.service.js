/*
 * CART RULES
 *  - Only published products from visible categories can be added.
 *  - Quantity: whole number, 1..MAX_QTY_PER_ITEM, never more than stock.
 *  - Totals are calculated here from the current product prices.
 *  - When the cart is read, items whose product was deleted, hidden or
 *    sold out are removed, and quantities above the stock are lowered;
 *    the customer gets a notice explaining what changed.
 */
const crypto = require("crypto");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const categoryService = require("./category.service");

const MAX_QTY_PER_ITEM = 50;
const MAX_ITEMS = 100;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function newToken() {
  return crypto.randomBytes(24).toString("base64url"); // 32 characters
}

function finalPriceOf(product) {
  return product.discountPrice != null && product.discountPrice < product.price ? product.discountPrice : product.price;
}

function readQuantity(value, { allowZero = false } = {}) {
  const quantity = Number(value);
  const min = allowZero ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < min || quantity > MAX_QTY_PER_ITEM) {
    throw new ApiError(400, `Quantity must be a whole number from ${min} to ${MAX_QTY_PER_ITEM}`);
  }
  return quantity;
}

function readProductId(value) {
  if (!categoryService.isValidId(value)) throw new ApiError(400, "Invalid product id");
  return String(value);
}

async function findCart(token) {
  if (!token || !TOKEN_PATTERN.test(token)) return null;
  return Cart.findOne({ token });
}

// Loads a product that may be sold right now, or throws.
async function findSellableProduct(productId) {
  const product = await Product.findOne({ _id: productId, isPublished: true }).lean();
  const visible = product && (await categoryService.getVisibleCategoryIds()).some((id) => id.equals(product.category));
  if (!visible) throw new ApiError(404, "This product is not available");
  return product;
}

// The cart as the customer sees it (also cleans up invalid items).
async function buildView(cart) {
  if (!cart || cart.items.length === 0) {
    return { items: [], count: 0, subtotal: 0, notices: [] };
  }

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) }, isPublished: true }).lean();
  const visible = new Set((await categoryService.getVisibleCategoryIds()).map(String));
  const byId = new Map(products.filter((p) => visible.has(String(p.category))).map((p) => [String(p._id), p]));

  const notices = [];
  const keep = [];
  const items = [];

  for (const item of cart.items) {
    const product = byId.get(String(item.product));
    if (!product) {
      notices.push("An item in your cart is no longer available and was removed.");
      continue;
    }
    if (product.stock <= 0) {
      notices.push(`${product.name} is out of stock and was removed from your cart.`);
      continue;
    }
    let quantity = item.quantity;
    if (quantity > product.stock) {
      quantity = product.stock;
      notices.push(`Only ${product.stock} of ${product.name} available - quantity updated.`);
    }
    keep.push({ product: product._id, quantity });

    const finalPrice = finalPriceOf(product);
    items.push({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] || null,
      unit: product.unit,
      price: product.price,
      finalPrice,
      quantity,
      stock: product.stock,
      maxQuantity: Math.min(product.stock, MAX_QTY_PER_ITEM),
      lineTotal: finalPrice * quantity,
    });
  }

  if (notices.length) {
    cart.items = keep;
    await cart.save();
  }

  return {
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
    notices,
  };
}

async function getCartView(token) {
  return buildView(await findCart(token));
}

// Returns { token, view }. Creates the cart on first add.
async function addItem(token, productIdInput, quantityInput = 1) {
  const productId = readProductId(productIdInput);
  const quantity = readQuantity(quantityInput);
  const product = await findSellableProduct(productId);
  if (product.stock <= 0) throw new ApiError(409, `${product.name} is out of stock`);

  let cart = await findCart(token);
  if (!cart) cart = new Cart({ token: newToken(), items: [] });

  const existing = cart.items.find((i) => String(i.product) === productId);
  const wanted = (existing?.quantity || 0) + quantity;
  const limit = Math.min(product.stock, MAX_QTY_PER_ITEM);
  if (wanted > limit) {
    throw new ApiError(409, `You can add at most ${limit} of ${product.name}`);
  }

  if (existing) existing.quantity = wanted;
  else {
    if (cart.items.length >= MAX_ITEMS) throw new ApiError(409, "Your cart is full");
    cart.items.push({ product: product._id, quantity });
  }
  await cart.save();
  return { token: cart.token, view: await buildView(cart) };
}

// quantity 0 removes the item.
async function setQuantity(token, productIdInput, quantityInput) {
  const productId = readProductId(productIdInput);
  const quantity = readQuantity(quantityInput, { allowZero: true });
  const cart = await findCart(token);
  const item = cart?.items.find((i) => String(i.product) === productId);
  if (!item) throw new ApiError(404, "This product is not in your cart");

  if (quantity === 0) {
    cart.items = cart.items.filter((i) => String(i.product) !== productId);
  } else {
    const product = await findSellableProduct(productId);
    const limit = Math.min(product.stock, MAX_QTY_PER_ITEM);
    if (quantity > limit) throw new ApiError(409, `You can add at most ${limit} of ${product.name}`);
    item.quantity = quantity;
  }
  await cart.save();
  return buildView(cart);
}

async function removeItem(token, productIdInput) {
  const productId = readProductId(productIdInput);
  const cart = await findCart(token);
  if (cart) {
    cart.items = cart.items.filter((i) => String(i.product) !== productId);
    await cart.save();
  }
  return buildView(cart);
}

async function clearCart(token) {
  const cart = await findCart(token);
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return buildView(cart);
}

module.exports = { getCartView, addItem, setQuantity, removeItem, clearCart, MAX_QTY_PER_ITEM };
