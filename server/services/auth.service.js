/*
 * Accounts: register, login, tokens.
 *  - Passwords are hashed with bcrypt (never stored as plain text).
 *  - A login creates a signed token (JWT) that the server puts in an
 *    httpOnly cookie; browser JavaScript can never read it.
 *  - Error messages never reveal whether an email/phone exists.
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const TOKEN_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const LOGIN_FAILED = "Incorrect email/mobile number or password";
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", BCRYPT_ROUNDS);

// "+880 1712-345678" / "8801712345678" / "01712345678" -> "01712345678"
function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(2);
  return digits;
}

function readString(body, key, { required = true, max = 200 } = {}) {
  const value = body?.[key];
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(400, `${key} is required`);
    return "";
  }
  if (typeof value !== "string") throw new ApiError(400, `${key} must be text`);
  if (value.length > max) throw new ApiError(400, `${key} is too long`);
  return value.trim();
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses || [],
  };
}

function createToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: `${TOKEN_DAYS}d`,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

function validatePassword(password) {
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");
  if (password.length > 72) throw new ApiError(400, "Password must be at most 72 characters");
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ApiError(400, "Password must contain at least one letter and one number");
  }
}

async function register(body) {
  const name = readString(body, "name", { max: 60 });
  const email = readString(body, "email", { max: 120 }).toLowerCase();
  const phone = normalizePhone(readString(body, "phone", { max: 20 }));
  const password = readString(body, "password", { max: 72 });
  validatePassword(password);

  if (!/^01[3-9]\d{8}$/.test(phone)) throw new ApiError(400, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Enter a valid email address");

  const taken = await User.findOne({ $or: [{ email }, { phone }] }).select("email phone").lean();
  if (taken) {
    throw new ApiError(
      409,
      taken.email === email ? "An account with this email already exists" : "An account with this mobile number already exists"
    );
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: "customer", // never taken from the request
    lastLoginAt: new Date(),
  });
  return user;
}

// identifier = email or mobile number
async function login(body) {
  const identifier = readString(body, "identifier", { max: 120 });
  const password = readString(body, "password", { max: 72 });

  const query = identifier.includes("@")
    ? { email: identifier.toLowerCase() }
    : { phone: normalizePhone(identifier) };
  const user = await User.findOne(query).select("+passwordHash");

  // Compare even when the user does not exist, so the response time does
  // not reveal which accounts exist.
  const matches = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !matches || !user.isActive) throw new ApiError(401, LOGIN_FAILED);

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

async function findActiveUser(id) {
  const user = await User.findById(id);
  return user?.isActive ? user : null;
}

module.exports = {
  register,
  login,
  createToken,
  verifyToken,
  publicUser,
  findActiveUser,
  normalizePhone,
  validatePassword,
  TOKEN_DAYS,
  BCRYPT_ROUNDS,
};
