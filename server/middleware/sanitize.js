
const META = /[\\^$.*+?()[\]{}|]/g;

const BODY_FIELDS = [
  "product", "city", "place", "query", "marketName",
  "shopName", "vendorName", "search", "category",
];

const clean = (v) =>
  v.replace(META, " ").replace(/\s+/g, " ").trim().slice(0, 120);

module.exports = function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    for (const k of BODY_FIELDS) {
      if (typeof req.body[k] === "string") req.body[k] = clean(req.body[k]);
    }
  }
  if (req.query && typeof req.query === "object") {
    for (const k of Object.keys(req.query)) {
      if (typeof req.query[k] === "string") req.query[k] = clean(req.query[k]);
    }
  }
  next();
};