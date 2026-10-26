// "Fruits & Vegetables" -> "fruits-and-vegetables"
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-") // anything else becomes "-"
    .replace(/^-+|-+$/g, "") // trim leading/trailing "-"
    .slice(0, 80)
    .replace(/-+$/g, "");
}

module.exports = slugify;
