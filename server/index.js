// Entry point: connect to MongoDB first, then start listening.
const env = require("./config/env");
const connectDB = require("./config/db");
const app = require("./app");

async function startServer() {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`Nexora Food API running at http://localhost:${env.port}`);
      console.log(`Allowed frontend: ${env.clientUrls.join(", ")}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
