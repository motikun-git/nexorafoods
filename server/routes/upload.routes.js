/*
 * Image upload for product photos (admins only).
 *  - only JPEG, PNG or WEBP, max 2 MB
 *  - the real file content is checked (not just the file name)
 *  - files get a random name, so nobody can overwrite or guess files
 *
 * Where images go:
 *  - Cloudinary (cloud image service) when CLOUDINARY_* is set in .env.
 *    Used in production, because hosting disks are wiped on every deploy.
 *  - server/uploads/ otherwise (development on your own PC).
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
if (!env.cloudinary.enabled) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

// Detect the real type from the first bytes of the file.
function detectImageType(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

// Signed upload straight to Cloudinary's REST API (no extra npm package).
// The secret never leaves the server; the signature proves the request is ours.
async function uploadToCloudinary(buffer, type, publicId) {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  const folder = "products";
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: `image/${type === "jpg" ? "jpeg" : type}` }), `${publicId}.${type}`);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.secure_url) {
    console.error("Cloudinary upload failed:", data?.error?.message || response.status);
    throw new ApiError(502, "Image storage is not available right now. Please try again.");
  }
  // f_auto,q_auto = Cloudinary picks the smallest good format for each visitor.
  return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}

const router = express.Router();

// POST /api/admin/uploads  (multipart form, field name "image")
router.post("/", (req, res, next) => {
  upload.single("image")(req, res, async (error) => {
    try {
      if (error) {
        throw new ApiError(400, error.code === "LIMIT_FILE_SIZE" ? "Image must be 2 MB or smaller" : "Upload failed");
      }
      if (!req.file) throw new ApiError(400, "Choose an image to upload");
      const type = detectImageType(req.file.buffer);
      if (!type) throw new ApiError(400, "Only JPEG, PNG or WEBP images are allowed");

      const id = crypto.randomBytes(16).toString("hex");
      if (env.cloudinary.enabled) {
        const url = await uploadToCloudinary(req.file.buffer, type, id);
        return res.status(201).json({ success: true, data: { url } });
      }
      await fs.promises.writeFile(path.join(UPLOAD_DIR, `${id}.${type}`), req.file.buffer);
      res.status(201).json({ success: true, data: { url: `/uploads/products/${id}.${type}` } });
    } catch (err) {
      next(err);
    }
  });
});

module.exports = router;
module.exports.UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
