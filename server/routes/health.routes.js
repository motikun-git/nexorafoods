const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// GET /api/health
router.get("/", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? "healthy" : "database disconnected",
    database: mongoose.connection.name || null,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

module.exports = router;
