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
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const { UPLOAD_ROOT } = require("./routes/upload.routes");
const { loadUser } = require("./middleware/auth.middleware");
const { requireAjaxHeader } = require("./middleware/csrf.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

// Behind a hosting proxy (Render, Nginx...) this gives the real visitor IP
// to the rate limiter.
if (env.isProduction) app.set("trust proxy", 1);

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
app.use("/api", requireAjaxHeader); // CSRF protection for changes
app.use("/api", loadUser); // sets req.user when logged in

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ success: true, message: "Nexora Food API is running!" });
});

app.use("/api/health", healthRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", catalogRoutes); // /api/categories, /api/products, /api/home

// Uploaded product images (public, read-only).
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    index: false,
    dotfiles: "deny",
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// ---------- Errors (must be last) ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
