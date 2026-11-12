/**
 * Single source of truth for "what is a fair price?".
 *
 * Before this existed, Check Price, the Scam Detector and the Pay Guard each
 * asked the LLM a DIFFERENT question with a different prompt, and the LLM was
 * even allowed to invent the scam probability. The same "bed in Jaipur" came
 * back as ₹9,000–15,000, ₹15,000–25,000 and ₹12,000–18,000 depending on the page.
 *
 * Now:
 *   1. ONE prompt produces the estimate, with temperature 0.
 *   2. The estimate is cached (MongoDB, 24h) so every feature reuses it.
 *   3. Community data (3+ verified price reports) always wins over the AI estimate.
 *   4. The verdict / scam probability is computed from numbers, never by the LLM.
 *   5. "Start bargaining" and "Target" are derived from the range, so the
 *      opening offer can never end up higher than the target again.
 */
const aiService = require("./aiService");
const mlService = require("./mlService");
const EstimateCache = require("../models/EstimateCache");
const ScamReport = require("../models/ScamReport");
const { escapeRegex } = require("../utils/regex");
const { normalizeProductName, productNameRegex } = require("../utils/productName");
const { normalizeCategory, categoryFilter, GUIDANCE, RISK_TOLERANCE, cleanComparisonDetails } = require("../utils/category");
const travelProviders = require("./travelProviders");

const TTL_MS = (Number(process.env.ESTIMATE_CACHE_HOURS) || 24) * 60 * 60 * 1000;
const MIN_COMMUNITY_REPORTS = 3;
const TRENDS = ["Rising", "Stable", "Falling"];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const text = (v, max = 240) => String(v ?? "").trim().slice(0, max);
const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();

function httpError(status, message) {
  const err = new Error(message);
  err.statusCode = status;
  return err;
}

// Round to a "human" price: 8,650 not 8,647.
function niceRound(n) {
  if (n >= 1000) return Math.round(n / 50) * 50;
  if (n >= 100) return Math.round(n / 10) * 10;
  if (n >= 20) return Math.round(n / 5) * 5;
  return Math.round(n);
}

// Check Price sends "bed at Johari Bazaar" as one string, while the Scam
// Detector sends product and place separately. Normalise both to the same thing.
function splitProduct(rawProduct, rawPlace) {
  let product = squash(rawProduct);
  let place = squash(rawPlace);
  if (!place) {
    const m = product.match(/^(.+?)\s+at\s+(.+)$/i);
    if (m) {
      product = m[1].trim();
      place = m[2].trim();
    }
  }
  return { product, place };
}

const cacheKey = ({ product, city, place, category, quality, details }) =>
  // Bump whenever estimate assumptions change so old hallucinated or
  // unit-mismatched results cannot survive the cache TTL.
  ["v8", product, city, place, category, quality, JSON.stringify(details || {})]
    .map((s) => squash(s).toLowerCase())
    .join("|")
    .slice(0, 300);

async function cacheGet(key) {
  try {
    const doc = await EstimateCache.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    return doc?.value || null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value) {
  try {
    await EstimateCache.updateOne(
      { key },
      { $set: { value, expiresAt: new Date(Date.now() + TTL_MS) } },
      { upsert: true }
    );
  } catch (err) {
    console.warn("estimate cache write failed:", err.message);
  }
}

// ── The one AI prompt ────────────────────────────────────────────────────────

const SYSTEM = `You are a fair-price estimator for Indian PHYSICAL markets (not online stores).
Give prices SPECIFIC to the city and market provided:
- Mumbai prices are typically 25-40% higher than Delhi.
- Jaipur, Varanasi and Agra are typically 10-25% cheaper than Delhi.
- Tourist-hotspot markets are 30-80% more expensive than neighbourhood bazaars.
- Treat "auto ride", "rickshaw ride" and "auto-rickshaw ride" as the same service. Assume a short, standard in-city trip and do not change the estimate just because a market/vendor area was selected; route distance affects the actual fare.
If the item name is vague, assume the most common mid-range version a tourist would buy.
When a quality tier is given, estimate only that tier and compare like-for-like; do not mix premium and low-quality items.
Return ONLY valid JSON. No markdown, no code fences.`;

function normaliseProfile(r) {
  let min = Number(r.fairPriceMin);
  let max = Number(r.fairPriceMax);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0 || min < 0)
    throw httpError(503, "The AI service returned an unusable price range. Please try again.");

  if (min > max) [min, max] = [max, min];
  if (min === max) {
    min = Math.round(max * 0.9);
    max = Math.round(max * 1.1);
  }
  const online = num(r.onlineAvg, 0);

  return {
    fairMin: Math.round(min),
    fairMax: Math.round(max),
    median: Math.round(clamp(num(r.localMarketAvg, (min + max) / 2), min, max)),
    onlineAvg: online > 0 ? Math.round(online) : null,
    touristPremium: clamp(Math.round(num(r.touristPremium, 30)), 0, 300),
    confidence: clamp(Math.round(num(r.confidenceScore, 45)), 20, 60),
    trend: TRENDS.includes(r.trend) ? r.trend : "Stable",
    bestTimeToBuy: text(r.bestTimeToBuy),
    aiRecommendation: text(r.aiRecommendation, 400),
    scamWarning: text(r.scamWarning),
    seasonalNote: text(r.seasonalNote),
  };
}

async function fetchProfile(ctx) {
  const where = ctx.place ? `${ctx.place}, ${ctx.city || "India"}` : ctx.city || "India";
  const prompt =
    `Estimate the fair price a LOCAL pays in a physical market for "${ctx.product}" in ${where}.` +
    ` Category: ${ctx.category}. Category comparison rule: ${GUIDANCE[ctx.category] || "Compare the same named category, model, size, quantity, material, and condition."}\n` +
    `${ctx.quality ? ` Quality tier: ${ctx.quality}; compare like-for-like quality.` : ""}\n` +
    `${ctx.category === "hotels" ? "Hotel price unit: return all fair range and average amounts per room per night. Use nights and guests as context, and do not multiply the price range by nights." : ""}\n` +
    `${ctx.category === "jewelry" && /lacquer|non-precious|wood|plastic|glass/i.test(ctx.details.metal || "") ? "IMPORTANT MATERIAL DISAMBIGUATION: this is a lacquer fashion bangle, not gold or silver. The user's word laakh/lac/lakh names the material; it is not a price of one lakh rupees. Do not use gold-per-gram pricing. Estimate only comparable lacquer bangles with the stated set size." : ""}\n` +
    `Category-specific details: ${JSON.stringify(ctx.details || {})}. Compare like-for-like using these details and state assumptions. Do not claim live market lookup.\n\n` +
    `Return exactly this JSON (all prices are INR numbers):\n` +
    `{\n` +
    `  "fairPriceMin": 0,\n` +
    `  "fairPriceMax": 0,\n` +
    `  "localMarketAvg": 0,\n` +
    `  "onlineAvg": 0,\n` +
    `  "touristPremium": 0,\n` +
    `  "confidenceScore": 40,\n` +
    `  "bestTimeToBuy": "max 15 words",\n` +
    `  "aiRecommendation": "one bargaining tip specific to ${where}, max 30 words",\n` +
    `  "scamWarning": "common scam for this item here, max 25 words, or empty string",\n` +
    `  "trend": "Stable",\n` +
    `  "seasonalNote": "max 15 words or empty string"\n` +
    `}\n\n` +
    `Rules: fairPriceMax must be at most 1.8 times fairPriceMin. touristPremium is the % tourists ` +
    `typically overpay. confidenceScore is between 30 and 55 because there is no community data. ` +
    `trend is Rising, Stable or Falling.`;

  const raw = await aiService.callAIRaw(prompt, SYSTEM, {
    maxTokens: 1200,
    temperature: 0,
    timeoutMs: 25000,
    json: true,
  });
  const profile = normaliseProfile(aiService.parseJSON(raw, { requiredFields: ["fairPriceMin", "fairPriceMax"] }));
  // A language model may still mistake "laakh" bangles for precious metal,
  // despite the prompt clarification. Never let that produce a five-figure
  // estimate for lacquer/costume pieces when there is no matching community data.
  if (
    ctx.category === "jewelry" &&
    /lacquer|non-precious|wood|plastic|glass/i.test(ctx.details?.metal || "") &&
    (profile.fairMax > 10000 || profile.fairMin > 10000)
  ) {
    return {
      ...profile,
      fairMin: 150,
      fairMax: 5000,
      median: 1200,
      onlineAvg: null,
      touristPremium: 0,
      confidence: 20,
      aiRecommendation: "Broad starting range only: lacquer and costume bangles vary by design and set size. Confirm the material and number of pieces, then compare local receipts.",
      scamWarning: "No verified local reports are available for this exact material and set. This broad range is not a market quote.",
    };
  }
  return profile;
}

const inflight = new Map();

// Cached + de-duplicated: ten simultaneous identical requests make ONE AI call.
async function getProfile(ctx) {
  const key = cacheKey(ctx);
  const cached = await cacheGet(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const pending = (async () => {
    const profile = await fetchProfile(ctx);
    await cacheSet(key, profile);
    return profile;
  })().finally(() => inflight.delete(key));

  inflight.set(key, pending);
  return pending;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a normalised estimate. Community data (3+ verified price reports) wins;
 * otherwise the cached AI estimate is used.
 */
async function estimate({ product, city = "", place = "", category = "", quality = "", details = {} }) {
  const split = splitProduct(product, place);
  const canonicalProduct = normalizeProductName(split.product);
  const canonicalCategory = normalizeCategory(category, canonicalProduct);
  const isAutoRide = canonicalProduct.toLowerCase() === "auto rickshaw ride";
  const ctx = {
    product: canonicalProduct,
    place: isAutoRide ? "" : split.place,
    city: squash(city),
    category: canonicalCategory.slice(0, 40),
    quality: ["poor", "fair", "good", "excellent"].includes(String(quality).toLowerCase()) ? String(quality).toLowerCase() : "",
    details: cleanComparisonDetails(canonicalCategory, details),
  };
  if (!ctx.product) throw httpError(400, "Product is required");

  if (ctx.category === "transport") {
    const pickup = ctx.details.pickup;
    const destination = ctx.details.destination;
    if (!pickup || !destination) throw httpError(400, "For a transport check, enter both pickup and destination so the fare is based on a route.");
    if (!ctx.city) throw httpError(400, "Enter the city for this transport route so pickup and destination can be located accurately.");
    const citySuffix = `, ${ctx.city}, India`;
    const trip = await travelProviders.route(`${pickup}${citySuffix}`, `${destination}${citySuffix}`);
    const distanceKm = Number(trip.routes[0].distanceKm);
    const durationMinutes = Math.round(trip.routes[0].durationMinutes);
    const vehicle = ctx.details.vehicle || "auto";
    let fairMin, fairMax, vehicleLabel, median, mean = null, std = null;
    const community = await mlService.getPriceDistribution(ctx.product, ctx.city, ctx.quality, ctx.category, ctx.details).catch(() => null);
    const hasRouteCommunity = Boolean(community && community.count >= MIN_COMMUNITY_REPORTS);
    if (hasRouteCommunity) {
      fairMin = community.p25; fairMax = community.p75;
      if (!(fairMax > fairMin)) { fairMin = Math.round(community.median * 0.9); fairMax = Math.round(community.median * 1.1); }
      median = community.median; mean = community.mean; std = community.std;
      vehicleLabel = vehicle === "cab" ? "app cab" : vehicle === "bus" ? "public transport" : "auto-rickshaw";
    } else if (vehicle === "cab") {
      fairMin = Math.round(50 + distanceKm * 16); fairMax = Math.round(80 + distanceKm * 24); vehicleLabel = "app cab";
    } else if (vehicle === "bus") {
      fairMin = Math.max(10, Math.round(distanceKm * 5)); fairMax = Math.max(fairMin, Math.round(distanceKm * 12)); vehicleLabel = "public transport";
    } else {
      fairMin = Math.round(25 + distanceKm * 12); fairMax = Math.round(35 + distanceKm * 18); vehicleLabel = "auto-rickshaw";
    }
    median = median || Math.round((fairMin + fairMax) / 2);
    const baseFareMin = fairMin;
    const baseFareMax = fairMax;
    const tollAmount = Number(ctx.details.tollAmount) || 0;
    const tollAdjustment = tollAmount > 0 && !hasRouteCommunity ? tollAmount : 0;
    if (tollAdjustment > 0) { fairMin += tollAdjustment; fairMax += tollAdjustment; median += tollAdjustment; }
    const comparisonBasis = `${distanceKm.toFixed(1)} km road route · about ${durationMinutes} min · ${vehicleLabel} · ${ctx.details.fareType || "meter"} fare${tollAdjustment > 0 ? ` · ₹${tollAdjustment} user-entered toll added` : ""} · ${pickup}, ${ctx.city} → ${destination}, ${ctx.city}`;
    return {
      product: ctx.product, category: ctx.category, place: ctx.place, city: ctx.city, quality: ctx.quality || "good",
      fairMin, fairMax, median, mean, std, onlineAvg: null, touristPremium: 0,
      bargainingStart: niceRound(fairMin * 0.85), bargainingTarget: niceRound(fairMin + 0.35 * (fairMax - fairMin)),
      confidence: hasRouteCommunity ? Math.min(98, 40 + community.count * 4) : 38,
      dataSource: hasRouteCommunity ? "community_verified" : "route_estimate",
      dataPoints: hasRouteCommunity ? community.count : 0,
      trend: hasRouteCommunity ? "Route-matched community data" : "Route-based estimate",
      bestTimeToBuy: "", aiRecommendation: "Confirm the vehicle, meter or fixed-fare terms, and any tolls before the trip.",
      scamWarning: hasRouteCommunity ? "This range uses verified reports for the same route and vehicle; traffic, time, tolls, and local rates can still change the fare." : "This is an indicative route-fare heuristic, not a regulated tariff or proof of fraud. Traffic, time, tolls, and local rates can change the fare.",
      seasonalNote: "", broad: false, hint: hasRouteCommunity ? "" : "Calculated from the road route and selected transport mode; no live meter or app fare was queried.",
      comparisonBasis, comparisonRule: GUIDANCE.transport, distanceKm, durationMinutes, vehicle, details: ctx.details,
      baseFareMin, baseFareMax, tollAdjustment,
    };
  }

  const dist = await mlService.getPriceDistribution(ctx.product, ctx.city, ctx.quality, ctx.category, ctx.details).catch(() => null);
  const hasCommunity = !!dist && dist.count >= MIN_COMMUNITY_REPORTS;
  const trend = hasCommunity
    ? await mlService.computePriceTrend(ctx.product, ctx.city, ctx.quality, ctx.category, ctx.details).catch(() => null)
    : null;

  let profile = null;
  let sparseCommunity = false;
  // Three or more matching verified reports are the source of truth. Skip the
  // external AI call entirely in that case for faster, deterministic responses.
  if (!hasCommunity) {
    try {
      profile = await getProfile(ctx);
    } catch (err) {
      if (dist?.count > 0) {
        // If the AI provider is down, return a deliberately wide, low-confidence band
        // from the small category-matched sample instead of failing the whole feature.
        sparseCommunity = true;
        const center = dist.median || dist.mean;
        const uncertainty = dist.count === 1 ? 0.45 : 0.25;
        profile = {
          fairMin: Math.max(1, Math.round(Math.min(dist.min, center * (1 - uncertainty)))),
          fairMax: Math.round(Math.max(dist.max, center * (1 + uncertainty))),
          median: Math.round(center), onlineAvg: null, touristPremium: 0,
          confidence: Math.min(30, 15 + dist.count * 5), trend: "Stable",
          bestTimeToBuy: "", aiRecommendation: "Compare the exact size, model, route or serving before deciding.",
          scamWarning: "Only a small number of matching community reports are available.", seasonalNote: "",
        };
      } else {
        err.statusCode = err.statusCode || 503;
        throw err;
      }
    }
  }

  let fairMin, fairMax, median, mean = null, std = null, touristPremium, confidence, dataSource, dataPoints;

  if (hasCommunity) {
    fairMin = dist.p25;
    fairMax = dist.p75;
    if (!(fairMax > fairMin)) {
      fairMin = Math.round(dist.median * 0.9);
      fairMax = Math.round(dist.median * 1.1);
    }
    median = dist.median;
    mean = dist.mean;
    std = dist.std;
    touristPremium = clamp(Math.round(((dist.p90 - dist.median) / (dist.median || 1)) * 100), 0, 300);
    confidence = Math.min(98, 40 + dist.count * 4);
    dataSource = "community_verified";
    dataPoints = dist.count;
  } else {
    fairMin = profile.fairMin;
    fairMax = profile.fairMax;
    median = profile.median;
    touristPremium = profile.touristPremium;
    confidence = profile.confidence;
    dataSource = sparseCommunity ? "community_limited" : "ai_estimate";
    dataPoints = sparseCommunity ? dist.count : 0;
  }

  const usableTrend = hasCommunity && trend && trend.trend !== "insufficient_data" ? trend : null;
  let seasonalNote = profile?.seasonalNote || "";
  if (usableTrend?.trend === "Rising")
    seasonalNote = `Prices are rising, so buy soon (about ₹${Math.abs(usableTrend.monthlyChange || 0).toLocaleString("en-IN")} more per month).`;
  else if (usableTrend?.trend === "Falling")
    seasonalNote = "Prices are falling, so you have negotiating power.";
  if (isAutoRide) seasonalNote = "";

  const broad = fairMax / Math.max(fairMin, 1) > 2.2;

  return {
    product: ctx.product,
    category: ctx.category,
    details: ctx.details,
    place: ctx.place,
    city: ctx.city,
    quality: ctx.quality || "good",
    fairMin,
    fairMax,
    median,
    mean,
    std,
    onlineAvg: isAutoRide ? null : profile?.onlineAvg ?? null,
    touristPremium: isAutoRide ? 0 : touristPremium,
    // Derived, so the opening offer is always BELOW the target, which is below the top of the range.
    bargainingStart: niceRound(fairMin * 0.85),
    bargainingTarget: niceRound(fairMin + 0.35 * (fairMax - fairMin)),
    confidence,
    dataSource,
    dataPoints,
    trend: isAutoRide ? "Route dependent" : usableTrend?.trend || profile?.trend || "Stable",
    bestTimeToBuy: isAutoRide ? "" : profile?.bestTimeToBuy || "",
    aiRecommendation: isAutoRide
      ? "Confirm the pickup and destination, then agree on the fare or check that the meter is running before departure."
      : profile?.aiRecommendation || "",
    scamWarning: isAutoRide
      ? "This estimate assumes a short in-city trip. Longer routes and traffic can change the fare."
      : profile?.scamWarning || "",
    seasonalNote,
    broad,
    comparisonBasis: Object.entries(ctx.details).map(([key, value]) => `${key}: ${value}`).join(" · "),
    comparisonRule: GUIDANCE[ctx.category] || "Compare the same product category, model, size, quantity, material, and condition.",
    hint: isAutoRide
      ? "A route-specific fare needs pickup and destination details."
      : broad
      ? "This range is wide because the item is vague. Add size, material or quality for a tighter estimate."
      : "",
  };
}

const verdictFor = (p) => (p >= 70 ? "Scam" : p >= 40 ? "Suspicious" : "Fair");

/**
 * Deterministic verdict. The LLM never decides the probability.
 * Community data → Z-score. AI estimate → position relative to the fair range.
 */
function judge(price, est, scamHistory = 0) {
  const { fairMin, fairMax } = est;
  const categoryTolerance = RISK_TOLERANCE[est.category] || 2.2;
  const mid = (fairMin + fairMax) / 2;
  const overpricingPercent = Math.round(((price - mid) / mid) * 100);

  let p;
  let zScore = null;

  if (est.dataSource === "community_verified" && est.std > 0) {
    const z = (price - est.mean) / est.std;
    zScore = Number(z.toFixed(2));
    if (z > categoryTolerance * 1.4) p = Math.min(99, 85 + (z - categoryTolerance * 1.4) * 8);
    else if (z > categoryTolerance) p = Math.min(84, 60 + (z - categoryTolerance) * 20);
    else if (z > categoryTolerance * 0.65) p = Math.min(59, 30 + (z - categoryTolerance * 0.65) * 24);
    else p = Math.max(5, z * 20);
  } else {
    const over = price / fairMax - 1;
    if (over <= 0) {
      if (price < fairMin) {
        p = Math.max(3, 8 * (price / fairMin));
      } else {
        const frac = fairMax > fairMin ? clamp((price - fairMin) / (fairMax - fairMin), 0, 1) : 0.5;
        p = 8 + 25 * frac; // 8–33: inside the range is always "Fair"
      }
    } else {
      p = Math.min(97, 33 + over * 100); // 7% over the top → Suspicious, 37% → Scam
    }
  }

  if (scamHistory > 0) p = Math.min(99, p + scamHistory * 5);
  if (est.dataSource === "community_limited" || est.dataSource === "route_estimate") p = Math.min(69, p);
  p = Math.round(p);

  return { scamProbability: p, verdict: verdictFor(p), overpricingPercent, zScore };
}

async function scamHistoryCount(product, city, category) {
  try {
    const n = await ScamReport.countDocuments({
      product: productNameRegex(product),
      ...(city && { city: new RegExp(escapeRegex(city), "i") }),
      ...categoryFilter(category, product),
    });
    return Math.min(n, 5);
  } catch {
    return 0;
  }
}

/** estimate + judge + scam history, in one call. Used by Scam Detector and Pay Guard. */
async function assess({ product, city, place, category, quality, price, details }) {
  const est = await estimate({ product, city, place, category, quality, details });
  // Hotel AI estimates are per room per night. A quoted booking total must be
  // compared with the same number of nights; otherwise a multi-night stay can
  // be incorrectly flagged as overpriced against a one-night rate.
  if (est.category === "hotels") {
    const nights = Number(est.details?.nights);
    if (!Number.isFinite(nights) || nights < 1) {
      throw httpError(400, "Enter the number of nights so the hotel quote can be compared correctly.");
    }
    // Community prices are contributed against matching stay details (including
    // nights), so they already represent the comparable booking total.
    if (est.dataSource === "ai_estimate") {
      est.fairMin = Math.round(est.fairMin * nights);
      est.fairMax = Math.round(est.fairMax * nights);
      est.median = Math.round(est.median * nights);
      est.bargainingStart = niceRound(est.fairMin * 0.85);
      est.bargainingTarget = niceRound(est.fairMin + 0.35 * (est.fairMax - est.fairMin));
      est.comparisonBasis = `${est.comparisonBasis ? `${est.comparisonBasis} · ` : ""}${nights}-night stay total`;
      est.hint = `AI reference is per room per night and has been multiplied by ${nights} night(s). Taxes, fees, cancellation terms, and included facilities can change the total.`;
    }
  }
  const scamHistory = await scamHistoryCount(est.product, est.city, est.category);
  return { est, scamHistory, ...judge(price, est, scamHistory) };
}

module.exports = { estimate, judge, assess, niceRound };
