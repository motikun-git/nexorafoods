// Builds the Express app (middleware + routes).
// Kept separate from index.js so automated tests can use the app
// without starting a real server.
const fs = require("fs");
const path = require("path");
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
const contactRoutes = require("./routes/contact.routes");
const { UPLOAD_ROOT } = require("./routes/upload.routes");
const { loadUser } = require("./middleware/auth.middleware");
const { requireAjaxHeader } = require("./middleware/csrf.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { createStoreProxy } = require("./utils/storeProxy");
const ApiError = require("./utils/ApiError");

const app = express();
const storeProxy = env.nextUrl ? createStoreProxy(env.nextUrl) : null;

// Behind a proxy (e.g. Nginx) this gives the real visitor IP
// to the rate limiter.
if (env.isProduction) app.set("trust proxy", env.trustProxy);

// ---------- Security & parsing ----------
// On a live server this one address serves everything:
//   /api/...    -> API (this app)
//   /admin/...  -> admin panel (admin/dist, when it has been built)
//   everything else -> the store (Next.js at NEXT_URL, when it is set)
const ADMIN_DIST = path.join(__dirname, "..", "admin", "dist");
const ADMIN_INDEX = path.join(ADMIN_DIST, "index.html");
const servesAdmin = fs.existsSync(ADMIN_INDEX);

app.use(
  helmet({
    // Which outside sources the website may load (blocks injected scripts).
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:", "https:"], // images may also be https links
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "connect-src": ["'self'"],
      },
    },
  })
); // secure HTTP headers
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
if (!env.nextUrl) {
  app.get("/", (req, res) => {
    res.json({ success: true, message: "Nexora Food API is running!" });
  });
}

app.use("/api/health", healthRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
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

// ---------- Admin panel (production build) ----------
if (servesAdmin) {
  // Never cached by shared caches, and never shown in search engines.
  const adminHeaders = (res) => res.set("X-Robots-Tag", "noindex, nofollow");
  app.use(
    "/admin/assets",
    express.static(path.join(ADMIN_DIST, "assets"), { immutable: true, maxAge: "1y", index: false, setHeaders: adminHeaders })
  );
  app.use("/admin", express.static(ADMIN_DIST, { index: false, redirect: false, maxAge: "1h", setHeaders: adminHeaders }));
  // Every admin page address (/admin, /admin/orders/NF-1001...) is handled by React.
  app.get(/^\/admin(\/.*)?$/, (req, res, next) => {
    if (req.path.startsWith("/admin/assets/")) return next(new ApiError(404, "File not found")); // a missing file, not a page
    adminHeaders(res);
    res.set("Cache-Control", "no-cache");
    res.sendFile(ADMIN_INDEX);
  });
}

// ---------- Store (Next.js) ----------
if (env.nextUrl) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next(); // unknown API address -> 404 below
    storeProxy(req, res);
  });
}

// ---------- Errors (must be last) ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
