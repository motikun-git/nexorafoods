// Builds the Express app (middleware + routes).
// Kept separate from index.js so automated tests can use the app
// without starting a real server.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const env = require("./config/env");
const healthRoutes = require("./routes/health.routes");
const catalogRoutes = require("./routes/catalog.routes");
const settingsRoutes = require("./routes/settings.routes");
const cartRoutes = require("./routes/cart.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

// ---------- Security & parsing ----------
app.use(helmet()); // secure HTTP headers
app.use(
  cors({
    origin: env.clientUrls, // only our frontend may call the API
    credentials: true, // allow login cookies
  })
);
app.use(express.json({ limit: "100kb" })); // reject huge request bodies
app.use(cookieParser());

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ success: true, message: "Nexora Food API is running!" });
});

app.use("/api/health", healthRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api", catalogRoutes); // /api/categories, /api/products, /api/home
// Coming next: /api/auth, /api/cart, /api/orders, /api/admin/...

// ---------- Errors (must be last) ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
