// Reads settings from .env in ONE place, so the rest of the code
// never touches process.env directly.
require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  // One or more frontend URLs allowed to call this API, comma-separated.
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
};

env.isProduction = env.nodeEnv === "production";

if (!env.mongoUri) {
  console.error("MONGODB_URI is missing from server/.env");
  process.exit(1);
}

module.exports = env;
