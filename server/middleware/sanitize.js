
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
    // Coordinates, radii, pagination and numeric filters must retain punctuation
    // (notably the decimal point in GPS coordinates). Validate them where used.
    const numericQuery = new Set(["lat", "lng", "latitude", "longitude", "radius", "radiusKm", "limit", "page", "min", "max"]);
    for (const k of Object.keys(req.query)) {
      if (typeof req.query[k] === "string" && !numericQuery.has(k)) req.query[k] = clean(req.query[k]);
    }
  }
  next();
};