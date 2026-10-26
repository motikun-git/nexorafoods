const express = require("express");
const { getSettings } = require("../services/settings.service");

const router = express.Router();

// GET /api/settings - public store settings (name, logo, colors, contact, hero)
router.get("/", async (req, res) => {
  res.json({ success: true, data: await getSettings() });
});

module.exports = router;
