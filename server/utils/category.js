const GROUPS = {
  textiles: ["textiles", "textile", "textiles & clothing", "clothing & textiles", "clothing", "apparel", "garments", "saree", "shawl"],
  handicrafts: ["handicrafts", "handicraft", "craft", "crafts", "handmade", "handicraft items"],
  jewelry: ["jewelry", "jewellery", "jewels", "gems", "gemstone"],
  food: ["food", "street food", "restaurant", "restaurants", "meal", "snack", "snacks"],
  hotels: ["hotel", "hotels", "hotels & stay", "stay", "accommodation", "lodging", "guest house"],
  transport: ["transport", "ride", "rides", "taxi", "cab", "auto", "auto rickshaw", "rickshaw", "bus", "train"],
  electronics: ["electronics", "electronic", "gadget", "gadgets", "phone", "mobile"],
  souvenirs: ["souvenir", "souvenirs", "gift", "gifts"],
  fruits: ["fruit", "fruits", "fruits & veg", "fruit & vegetables", "vegetable", "vegetables", "produce", "grocery", "groceries"],
  tickets: ["ticket", "tickets", "tickets & entry", "entry", "attraction", "attractions", "museum", "tour"],
};

const GUIDANCE = {
  textiles: "Compare fabric, fiber, dimensions, weave, and stitching. Check whether the item is handwoven or machine-made.",
  handicrafts: "Compare material, dimensions, workmanship, and whether it is handmade. Do not treat different sizes or materials as equivalent.",
  jewelry: "Compare the same design and number of pieces. Only apply precious-metal pricing when gold or silver, purity, and weight are specified. Treat lacquer, wood, plastic, or glass as non-precious materials; never interpret lacquer/lac/lakh as a rupee amount.",
  food: "Compare the same dish, serving size, and dine-in or takeaway context. Account for menu prices and clearly stated taxes.",
  hotels: "Compare the same room type per night, dates, guest count, taxes, cancellation terms, and included facilities.",
  transport: "Compare the same route, distance, time, vehicle, tolls, and meter or app-fare terms. Without route details, call the result a rough city estimate and do not infer fraud from price alone.",
  electronics: "Compare exact model, storage/specification, new or used condition, warranty, and included accessories. Check authenticity and invoice separately.",
  souvenirs: "Compare material, size, finish, and bundle contents; tourist-market variation can be substantial.",
  fruits: "Compare the same variety and weight, freshness, and season. Convert prices to a common unit before comparing.",
  tickets: "Compare the same venue, date, visitor type, included access, and official fee. A reseller premium is not by itself proof of fraud.",
};

const RISK_TOLERANCE = {
  textiles: 2.2, handicrafts: 2.2, jewelry: 2.7, food: 2.0,
  hotels: 2.6, transport: 2.8, electronics: 2.5, souvenirs: 2.1,
  fruits: 2.0, tickets: 2.5,
};

const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const productGuess = (product) => {
  const value = String(product || "").toLowerCase();
  const tests = [
    ["transport", /\b(auto|rickshaw|taxi|cab|ride|fare|bus|train)\b/],
    ["hotels", /\b(hotel|room|hostel|guesthouse|lodging|stay)\b/],
    ["tickets", /\b(ticket|entry|admission|museum|monument|attraction)\b/],
    ["jewelry", /\b(jewel|jewellery|jewelry|gold|silver|gemstone|bangle|bangles|chuda|chooda|chudi|bracelet)\b/],
    ["electronics", /\b(phone|mobile|laptop|charger|earbuds|electronics|camera)\b/],
    ["food", /\b(food|meal|snack|thali|pani puri|chaat|chai|tea|coffee|restaurant)\b/],
    ["fruits", /\b(fruit|vegetable|mango|apple|banana|tomato|potato|onion|kg)\b/],
    ["textiles", /\b(saree|sari|shawl|carpet|rug|textile|fabric|shirt|clothing|pashmina)\b/],
    ["handicrafts", /\b(handmade|handicraft|craft|marble|carving|pottery)\b/],
    ["souvenirs", /\b(souvenir|magnet|keychain|gift|postcard)\b/],
  ];
  return tests.find(([, pattern]) => pattern.test(value))?.[0] || "";
};

function normalizeCategory(value, product = "") {
  const raw = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (raw && raw !== "other" && raw !== "all" && raw !== "all categories" && raw !== "any") {
    for (const [canonical, aliases] of Object.entries(GROUPS)) {
      if (aliases.includes(raw)) return canonical;
    }
    return raw;
  }
  return productGuess(product) || (["all", "all categories", "any"].includes(raw) ? "" : "other");
}

function categoryFilter(category, product = "") {
  const canonical = normalizeCategory(category, product);
  if (!canonical || canonical === "other") return canonical === "other" ? { category: /^other$/i } : {};
  const aliases = GROUPS[canonical];
  const categoryPattern = new RegExp(`^(?:${(aliases || [canonical]).map(escape).join("|")})$`, "i");
  return { $or: [{ category: categoryPattern }, { category: /^other$/i }] };
}


const DETAIL_FIELDS = {
  transport: ["pickup", "destination", "vehicle", "fareType", "distanceKm", "tollAmount"],
  hotels: ["roomType", "nights", "guests", "stayDate"],
  food: ["serving", "serviceMode", "quantity"],
  textiles: ["material", "dimensions", "make"],
  handicrafts: ["material", "dimensions", "make"],
  jewelry: ["metal", "purity", "weightGrams", "pieceCount", "stones"],
  electronics: ["model", "condition", "specs", "warranty"],
  souvenirs: ["material", "dimensions", "bundle"],
  fruits: ["variety", "quantity", "unit", "freshness"],
  tickets: ["venue", "visitDate", "visitorType", "access"],
};

function cleanComparisonDetails(category, value = {}) {
  const canonical = normalizeCategory(category);
  const allowed = DETAIL_FIELDS[canonical] || [];
  const result = {};
  for (const key of allowed) {
    const raw = value && value[key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (["distanceKm", "nights", "guests", "quantity", "weightGrams", "pieceCount", "tollAmount"].includes(key)) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        result[key] = ["nights", "guests", "pieceCount"].includes(key)
          ? Math.min(1000, Math.max(1, Math.round(n)))
          : Math.min(n, 100000);
      }
    } else {
      let clean = String(raw).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
      if (canonical === "jewelry" && key === "metal" && /^(laakh|lakh|lac|lacquer)$/i.test(clean)) {
        clean = "lacquer (non-precious bangle material)";
      }
      if (clean) result[key] = clean;
    }
  }
  if (canonical === "transport" && result.vehicle && !["auto", "cab", "bus"].includes(result.vehicle.toLowerCase())) result.vehicle = "auto";
  return result;
}

function detailsFilter(category, details = {}) {
  const canonical = normalizeCategory(category);
  const fields = DETAIL_FIELDS[canonical] || [];
  const filter = {};
  for (const key of fields) {
    const value = details[key];
    if (value === undefined || value === null || value === "" || key === "distanceKm") continue;
    filter[`details.${key}`] = typeof value === "number"
      ? value
      : new RegExp(`^${escape(String(value).trim())}$`, "i");
  }
  return filter;
}

module.exports = { GROUPS, GUIDANCE, RISK_TOLERANCE, normalizeCategory, categoryFilter, cleanComparisonDetails, detailsFilter };
