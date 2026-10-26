require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Nexora Food API is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
  });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Nexora Food API running at http://localhost:${PORT}`);
  });
}

startServer();
