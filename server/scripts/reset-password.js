/*
 * Sets a new password for an EXISTING account (e.g. a forgotten admin password).
 * Runs only from your own computer, never through the website.
 *
 *   npm.cmd run reset-password -- you@example.com
 *   npm.cmd run reset-password -- 01XXXXXXXXX
 *
 * The new password is typed in hidden (nothing shows on screen) and is never
 * passed on the command line, so it is not saved in the terminal history.
 * Your server/.env decides which database is changed (the online site uses
 * the same database, so the new password works there too).
 */
const readline = require("readline");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const { normalizePhone, validatePassword, BCRYPT_ROUNDS } = require("../services/auth.service");

// Ask a question without showing what is typed.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let asked = false;
    rl._writeToOutput = (text) => {
      if (!asked) {
        rl.output.write(text);
        asked = true;
      }
    };
    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

async function run() {
  const identifier = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!identifier) {
    console.log("Usage: npm.cmd run reset-password -- <email or mobile>");
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const query = identifier.includes("@") ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
  const user = await User.findOne(query);
  if (!user) {
    console.log(`No account found for "${identifier}".`);
    process.exitCode = 1;
    return;
  }
  console.log(`Account: ${user.name} (${user.email}) - role: ${user.role}`);

  const password = await askHidden("New password (8+ characters, letters and numbers): ");
  try {
    validatePassword(password);
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
    return;
  }
  const again = await askHidden("Type the new password again: ");
  if (again !== password) {
    console.log("The two passwords do not match. Nothing was changed.");
    process.exitCode = 1;
    return;
  }

  await User.updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } });
  console.log("Password changed. Log in on the website with the new password.");
}

run()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
