/*
 * Gives (or removes) admin rights for an EXISTING account.
 * Admin rights can never be obtained through the website itself.
 *
 *   npm.cmd run make-admin -- you@example.com           -> make admin
 *   npm.cmd run make-admin -- you@example.com --remove  -> back to customer
 *
 * (01XXXXXXXXX mobile numbers work instead of the email too.)
 */
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const { normalizePhone } = require("../services/auth.service");

async function run() {
  const args = process.argv.slice(2);
  const identifier = args.find((a) => !a.startsWith("--"));
  const remove = args.includes("--remove");
  if (!identifier) {
    console.log("Usage: npm.cmd run make-admin -- <email or mobile> [--remove]");
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const query = identifier.includes("@") ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
  const user = await User.findOne(query);
  if (!user) {
    console.log(`No account found for "${identifier}". Register on the website first.`);
    process.exitCode = 1;
    return;
  }

  user.role = remove ? "customer" : "admin";
  await user.save();
  console.log(`${user.name} (${user.email}) is now: ${user.role.toUpperCase()}`);
  if (!remove) console.log("Log out and log in again on the website, then open /admin");
}

run()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
