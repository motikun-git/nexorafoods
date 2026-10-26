// Reads settings from .env in ONE place, so the rest of the code
// never touches process.env directly.
require("dotenv").config({ quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  // One or more frontend URLs allowed to call this API, comma-separated.
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  // Secret used to sign login tokens. Long random string, never shared.
  jwtSecret: process.env.JWT_SECRET,
  // Max login/register attempts per IP address per 15 minutes.
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 20,
};

env.isProduction = env.nodeEnv === "production";

if (!env.mongoUri) {
  console.error("MONGODB_URI is missing from server/.env");
  process.exit(1);
}

if (!env.jwtSecret || env.jwtSecret.length < 32) {
  console.error(
    "JWT_SECRET is missing (or shorter than 32 characters) in server/.env\n" +
      'Create one with:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  process.exit(1);
}

module.exports = env;
