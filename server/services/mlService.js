/**
 * ML engine — runs entirely on your server.
 * No external API. Pure mathematics on your MongoDB data.
 */

const PriceReport = require("../models/PriceReport");
const ScamReport  = require("../models/ScamReport");

// ── 1. Statistical anomaly detection ─────────────────────────────────────────

async function detectPriceAnomaly(product, city, offeredPrice) {
  const reports = await PriceReport.find({
    product: { $regex: new RegExp(product.split(" ").join("|"), "i") },
    ...(city && { city: { $regex: new RegExp(city, "i") } }),
    isVerified: true,
  }).select("pricePaid").lean();

  if (reports.length < 3) {
    return { hasEnoughData: false, dataPoints: reports.length, anomaly: null };
  }

  const prices = reports.map(r => r.pricePaid);
  const mean   = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std    = Math.sqrt(
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
  );

  const zScore = std > 0 ? (offeredPrice - mean) / std : 0;

  const sorted       = [...prices].sort((a, b) => a - b);
  const q1           = sorted[Math.floor(sorted.length * 0.25)];
  const q3           = sorted[Math.floor(sorted.length * 0.75)];
  const iqr          = q3 - q1;
  const upperFence   = q3 + 1.5 * iqr;
  const isIQROutlier = offeredPrice > upperFence;

  const isAnomaly = zScore > 2.0 || isIQROutlier;
  const severity  = zScore > 3 ? "extreme"
    : zScore > 2 ? "high"
    : zScore > 1.5 ? "moderate"
    : "normal";

  const overchargePercent = mean > 0
    ? Math.round(((offeredPrice - mean) / mean) * 100)
    : 0;

  return {
    hasEnoughData:   true,
    dataPoints:      reports.length,
    mean:            Math.round(mean),
    median:          sorted[Math.floor(sorted.length / 2)],
    std:             Math.round(std),
    min:             sorted[0],
    max:             sorted[sorted.length - 1],
    q1:              Math.round(q1),
    q3:              Math.round(q3),
    upperFence:      Math.round(upperFence),
    zScore:          parseFloat(zScore.toFixed(2)),
    isAnomaly,
    isIQROutlier,
    severity,
    overchargePercent,
    confidenceScore: Math.min(100, Math.round(30 + reports.length * 3.5)),
  };
}

// ── 2. TF-IDF product similarity ──────────────────────────────────────────────

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function computeTFIDF(documents) {
  const N  = documents.length;
  const tf = documents.map(tokens => {
    const freq  = {};
    tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
    const total = tokens.length || 1;
    const result = {};
    Object.keys(freq).forEach(t => { result[t] = freq[t] / total; });
    return result;
  });

  const df = {};
  documents.forEach(tokens => {
    const unique = new Set(tokens);
    unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });

  const idf = {};
  Object.keys(df).forEach(t => {
    idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;
  });

  return tf.map(tfDoc => {
    const vec = {};
    Object.keys(tfDoc).forEach(t => { vec[t] = tfDoc[t] * (idf[t] || 1); });
    return vec;
  });
}

function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(k => {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot  += a * b;
    magA += a * a;
    magB += b * b;
  });
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

async function findSimilarReports(queryProduct, city, limit = 10) {
  const candidates = await PriceReport.find({
    ...(city && { city: { $regex: new RegExp(city, "i") } }),
    isVerified: true,
  })
    .select("product pricePaid city marketName shopName createdAt")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  if (!candidates.length) return [];

  const queryTokens  = tokenize(queryProduct);
  const docTokens    = candidates.map(c => tokenize(c.product));
  const allTokens    = [queryTokens, ...docTokens];
  const tfidfVectors = computeTFIDF(allTokens);
  const queryVec     = tfidfVectors[0];
  const docVecs      = tfidfVectors.slice(1);

  return candidates
    .map((doc, i) => ({ ...doc, similarity: cosineSimilarity(queryVec, docVecs[i]) }))
    .filter(d => d.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// ── 3. Linear regression price trend ─────────────────────────────────────────

async function computePriceTrend(product, city) {
  const reports = await PriceReport.find({
    product: { $regex: new RegExp(product.split(" ").join("|"), "i") },
    ...(city && { city: { $regex: new RegExp(city, "i") } }),
  })
    .select("pricePaid createdAt")
    .sort({ createdAt: 1 })
    .lean();

  if (reports.length < 5) return { trend: "insufficient_data", slope: 0 };

  const t0 = new Date(reports[0].createdAt).getTime();
  const xs = reports.map(r => (new Date(r.createdAt).getTime() - t0) / 86400000);
  const ys = reports.map(r => r.pricePaid);
  const n  = xs.length;

  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

  const monthlyChange = slope * 30;
  const avgY          = sumY / n;
  const pctPerMonth   = avgY > 0 ? (monthlyChange / avgY) * 100 : 0;

  return {
    trend:             slope > 0.5 ? "Rising" : slope < -0.5 ? "Falling" : "Stable",
    slope:             parseFloat(slope.toFixed(3)),
    monthlyChange:     Math.round(monthlyChange),
    pctChangePerMonth: parseFloat(pctPerMonth.toFixed(1)),
    dataPoints:        n,
    spanDays:          Math.round(xs[xs.length - 1]),
  };
}

// ── 4. Market trust score ─────────────────────────────────────────────────────

async function computeMarketTrustScore(city, marketName) {
  const filter = { city: { $regex: new RegExp(city, "i") } };
  if (marketName) filter.marketName = { $regex: new RegExp(marketName, "i") };

  const [priceReports, scamReports] = await Promise.all([
    PriceReport.find(filter).select("pricePaid helpfulVotes isVerified").lean(),
    ScamReport.find(filter).select("severity").lean(),
  ]);

  const reportCount   = priceReports.length;
  const verifiedCount = priceReports.filter(r => r.isVerified).length;
  const scamWeight    = scamReports.reduce((sum, r) => {
    return sum + (r.severity === "high" ? 3 : r.severity === "medium" ? 2 : 1);
  }, 0);

  const dataScore   = Math.min(100, reportCount * 5);
  const verifyScore = reportCount > 0 ? (verifiedCount / reportCount) * 100 : 50;
  const scamPenalty = Math.min(80, scamWeight * 8);
  const scamScore   = Math.max(0, 100 - scamPenalty);
  const trustScore  = Math.round(dataScore * 0.25 + verifyScore * 0.35 + scamScore * 0.40);

  return {
    trustScore:  Math.min(100, trustScore),
    reportCount,
    verifiedCount,
    scamCount:   scamReports.length,
    scamWeight,
    riskLevel:   scamScore < 40 ? "High" : scamScore < 70 ? "Medium" : "Low",
    dataRichness: reportCount < 5 ? "sparse" : reportCount < 20 ? "moderate" : "rich",
  };
}

// ── 5. Price distribution ─────────────────────────────────────────────────────

async function getPriceDistribution(product, city) {
  const reports = await PriceReport.find({
    product:    { $regex: new RegExp(product.split(" ").join("|"), "i") },
    ...(city && { city: { $regex: new RegExp(city, "i") } }),
    isVerified: true,
  }).select("pricePaid").lean();

  if (!reports.length) return null;

  const prices = reports.map(r => r.pricePaid).sort((a, b) => a - b);
  const n      = prices.length;
  const mean   = prices.reduce((a, b) => a + b, 0) / n;
  const std    = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / n);
  const range  = (prices[n - 1] - prices[0]) || 1;
  const bucket = range / 10;

  const histogram = Array.from({ length: 10 }, (_, i) => {
    const lo  = prices[0] + i * bucket;
    const hi  = lo + bucket;
    const cnt = prices.filter(p => p >= lo && (i === 9 ? p <= hi : p < hi)).length;
    return { lo: Math.round(lo), hi: Math.round(hi), count: cnt };
  });

  return {
    count:     n,
    mean:      Math.round(mean),
    std:       Math.round(std),
    min:       prices[0],
    max:       prices[n - 1],
    p10:       prices[Math.floor(n * 0.10)],
    p25:       prices[Math.floor(n * 0.25)],
    median:    prices[Math.floor(n * 0.50)],
    p75:       prices[Math.floor(n * 0.75)],
    p90:       prices[Math.floor(n * 0.90)],
    histogram,
    cv:        parseFloat((std / mean * 100).toFixed(1)),
  };
}

module.exports = {
  detectPriceAnomaly,
  findSimilarReports,
  computePriceTrend,
  computeMarketTrustScore,
  getPriceDistribution,
};