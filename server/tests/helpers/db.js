// Tests use a SEPARATE database (nexora_food_test) on the same cluster,
// so real shop data in "nexora_food" is never touched.
const mongoose = require("mongoose");
const env = require("../../config/env");

const TEST_DB = "nexora_food_test";

function assertTestDatabase() {
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(`Refusing to modify "${mongoose.connection.name}" - tests only use ${TEST_DB}`);
  }
}

async function connectTestDB() {
  await mongoose.connect(process.env.MONGODB_TEST_URI || env.mongoUri, { dbName: TEST_DB });
  assertTestDatabase();
  await mongoose.connection.dropDatabase();
  // Create collections + unique indexes before any test runs.
  for (const model of Object.values(mongoose.models)) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

async function clearTestDB() {
  assertTestDatabase();
  for (const model of Object.values(mongoose.models)) {
    await model.deleteMany({});
  }
}

async function disconnectTestDB() {
  assertTestDatabase();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { connectTestDB, clearTestDB, disconnectTestDB };
