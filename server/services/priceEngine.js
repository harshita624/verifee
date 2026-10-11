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
 *   3. Community data (3+ verified receipts) always wins over the AI estimate.
 *   4. The verdict / scam probability is computed from numbers, never by the LLM.
 *   5. "Start bargaining" and "Target" are derived from the range, so the
 *      opening offer can never end up higher than the target again.
 */
const aiService = require("./aiService");
const mlService = require("./mlService");
const EstimateCache = require("../models/EstimateCache");
const ScamReport = require("../models/ScamReport");
const { escapeRegex } = require("../utils/regex");

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

const cacheKey = ({ product, city, place, category }) =>
  ["v1", product, city, place, category]
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
If the item name is vague, assume the most common mid-range version a tourist would buy.
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
    `${ctx.category ? ` Category: ${ctx.category}.` : ""}\n\n` +
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
  return normaliseProfile(aiService.parseJSON(raw, { requiredFields: ["fairPriceMin", "fairPriceMax"] }));
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
 * Returns a normalised estimate. Community data (3+ verified receipts) wins;
 * otherwise the cached AI estimate is used.
 */
async function estimate({ product, city = "", place = "", category = "" }) {
  const split = splitProduct(product, place);
  const ctx = {
    product: split.product,
    place: split.place,
    city: squash(city),
    category: squash(category).slice(0, 40),
  };
  if (!ctx.product) throw httpError(400, "Product is required");

  const dist = await mlService.getPriceDistribution(ctx.product, ctx.city).catch(() => null);
  const hasCommunity = !!dist && dist.count >= MIN_COMMUNITY_REPORTS;
  const trend = hasCommunity
    ? await mlService.computePriceTrend(ctx.product, ctx.city).catch(() => null)
    : null;

  let profile = null;
  try {
    profile = await getProfile(ctx);
  } catch (err) {
    if (!hasCommunity) {
      err.statusCode = err.statusCode || 503;
      throw err;
    }
    console.warn("AI profile unavailable, using community data only:", err.message);
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
    dataSource = "ai_estimate";
    dataPoints = 0;
  }

  const usableTrend = hasCommunity && trend && trend.trend !== "insufficient_data" ? trend : null;
  let seasonalNote = profile?.seasonalNote || "";
  if (usableTrend?.trend === "Rising")
    seasonalNote = `Prices are rising, so buy soon (about ₹${Math.abs(usableTrend.monthlyChange || 0).toLocaleString("en-IN")} more per month).`;
  else if (usableTrend?.trend === "Falling")
    seasonalNote = "Prices are falling, so you have negotiating power.";

  const broad = fairMax / Math.max(fairMin, 1) > 2.2;

  return {
    product: ctx.product,
    place: ctx.place,
    city: ctx.city,
    fairMin,
    fairMax,
    median,
    mean,
    std,
    onlineAvg: profile?.onlineAvg ?? null,
    touristPremium,
    // Derived, so the opening offer is always BELOW the target, which is below the top of the range.
    bargainingStart: niceRound(fairMin * 0.85),
    bargainingTarget: niceRound(fairMin + 0.35 * (fairMax - fairMin)),
    confidence,
    dataSource,
    dataPoints,
    trend: usableTrend?.trend || profile?.trend || "Stable",
    bestTimeToBuy: profile?.bestTimeToBuy || "",
    aiRecommendation: profile?.aiRecommendation || "",
    scamWarning: profile?.scamWarning || "",
    seasonalNote,
    broad,
    hint: broad
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
  const mid = (fairMin + fairMax) / 2;
  const overpricingPercent = Math.round(((price - mid) / mid) * 100);

  let p;
  let zScore = null;

  if (est.dataSource === "community_verified" && est.std > 0) {
    const z = (price - est.mean) / est.std;
    zScore = Number(z.toFixed(2));
    if (z > 3) p = Math.min(99, 85 + z * 3);
    else if (z > 2) p = Math.min(84, 60 + z * 12);
    else if (z > 1) p = Math.min(59, 30 + z * 18);
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
  p = Math.round(p);

  return { scamProbability: p, verdict: verdictFor(p), overpricingPercent, zScore };
}

async function scamHistoryCount(product, city) {
  try {
    const n = await ScamReport.countDocuments({
      product: new RegExp(escapeRegex(product), "i"),
      ...(city && { city: new RegExp(escapeRegex(city), "i") }),
    });
    return Math.min(n, 5);
  } catch {
    return 0;
  }
}

/** estimate + judge + scam history, in one call. Used by Scam Detector and Pay Guard. */
async function assess({ product, city, place, category, price }) {
  const est = await estimate({ product, city, place, category });
  const scamHistory = await scamHistoryCount(est.product, est.city);
  return { est, scamHistory, ...judge(price, est, scamHistory) };
}

module.exports = { estimate, judge, assess, niceRound };