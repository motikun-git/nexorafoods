const mongoose = require("mongoose");
const env = require("./env");

// Only fields defined in a schema can be used in queries.
mongoose.set("strictQuery", true);

async function connectDB() {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB Atlas connected successfully!");
  console.log("Database:", mongoose.connection.name);
}

module.exports = connectDB;
