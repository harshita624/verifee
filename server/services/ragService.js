/**
 * RAG — Retrieval-Augmented Generation.
 * Fetches real community data BEFORE the LLM is called.
 */

const mlService  = require("./mlService");

// Build a structured context block from real DB data
async function buildContext(product, city, offeredPrice) {
  if (!product) {
    return { contextBlock: "", hasRealData: false, dataPoints: 0 };
  }

  const [similar, anomaly, trend, distribution] = await Promise.all([
    mlService.findSimilarReports(product, city || "", 8),
    offeredPrice
      ? mlService.detectPriceAnomaly(product, city || "", offeredPrice)
      : Promise.resolve(null),
    mlService.computePriceTrend(product, city || ""),
    mlService.getPriceDistribution(product, city || ""),
  ]);

  const lines = [];

  // Community data
  if (similar && similar.length > 0) {
    lines.push("=== VERIFIED COMMUNITY PRICE DATA ===");
    lines.push(`${similar.length} similar verified purchases found:`);
    similar.forEach((r, i) => {
      lines.push(
        `${i + 1}. ₹${r.pricePaid?.toLocaleString()} for "${r.product}" in ${r.city}` +
        (r.marketName ? ` at ${r.marketName}` : "") +
        ` (match: ${Math.round((r.similarity || 0) * 100)}%)`
      );
    });
    lines.push("");
  }

  // Statistical analysis
  if (distribution && distribution.count > 0) {
    lines.push("=== STATISTICAL ANALYSIS ===");
    lines.push(`${distribution.count} verified receipts:`);
    lines.push(`- Median: ₹${distribution.median?.toLocaleString()}`);
    lines.push(`- Mean: ₹${distribution.mean?.toLocaleString()} ±₹${distribution.std?.toLocaleString()}`);
    lines.push(`- Good deal: under ₹${distribution.p25?.toLocaleString()}`);
    lines.push(`- Acceptable: under ₹${distribution.p75?.toLocaleString()}`);
    lines.push(`- Range: ₹${distribution.min?.toLocaleString()} – ₹${distribution.max?.toLocaleString()}`);
    lines.push(`- Price stability: ${(distribution.cv || 0) < 20 ? "High" : (distribution.cv || 0) < 50 ? "Medium" : "Low"}`);
    lines.push("");
  }

  // Anomaly
  if (anomaly) {
    lines.push("=== ANOMALY DETECTION ===");
    if (anomaly.hasEnoughData) {
      if (anomaly.isAnomaly) {
        lines.push("PRICE IS STATISTICALLY ANOMALOUS:");
        lines.push(`- Z-score: ${anomaly.zScore} (>2.0 = suspicious)`);
        lines.push(`- Overcharge: ${anomaly.overchargePercent}% above community average`);
        lines.push(`- Severity: ${anomaly.severity}`);
      } else {
        lines.push(`Price is within normal range (Z-score: ${anomaly.zScore})`);
        lines.push(
          `${anomaly.overchargePercent > 0
            ? anomaly.overchargePercent + "% above"
            : Math.abs(anomaly.overchargePercent) + "% below"} community average`
        );
      }
      lines.push(`Based on ${anomaly.dataPoints} data points`);
    } else {
      lines.push(`Only ${anomaly.dataPoints} data points — limited statistical confidence.`);
    }
    lines.push("");
  }

  // Trend
  if (trend && trend.trend && trend.trend !== "insufficient_data") {
    lines.push("=== PRICE TREND ===");
    lines.push(
      `Trend: ${trend.trend} (${(trend.pctChangePerMonth || 0) > 0 ? "+" : ""}${trend.pctChangePerMonth || 0}%/month over ${trend.spanDays || 0} days)`
    );
    lines.push("");
  }

  const contextBlock = lines.join("\n");
  const hasRealData  = (similar && similar.length > 0) || (distribution && distribution.count > 0);
  const dataPoints   = distribution?.count || (similar?.length || 0);

  return {
    contextBlock,
    hasRealData,
    dataPoints,
    anomaly,
    distribution,
    similarReports: similar || [],
    trend,
  };
}

// Assemble the full grounded prompt for the LLM
function buildGroundedPrompt(userMessage, ragContext, nlpResult, sessionCtx) {
  const { contextBlock, hasRealData } = ragContext || {};
  const { intent, entities }          = nlpResult  || {};

  // FIX: null-safe session context access
  const city           = (entities && entities.city)    || (sessionCtx && sessionCtx.city)    || "unknown";
  const product        = (entities && entities.product)  || (sessionCtx && sessionCtx.product)  || "unknown";
  const recentIntents  = (sessionCtx && sessionCtx.recentIntents) || [];

  const systemPrompt = `You are Verifee's intelligent shopping assistant for Indian markets.

RULES:
- Ground your answer in the VERIFIED COMMUNITY DATA below if available
- When real data exists, cite it: "Based on X verified purchases..."
- State the Z-score finding in plain English when it flags an anomaly
- Give specific INR amounts
- Be direct — the user may be standing in a market right now
- Never say "I think" — use the data or say honestly there isn't enough
- No emojis
- Under 120 words unless a detailed breakdown is requested

DETECTED CONTEXT:
- Intent: ${intent || "general"}
- Product: ${product}
- City: ${city}
- Price mentioned: ${(entities && entities.price) ? "₹" + entities.price : "none"}
- Recent session: ${recentIntents.join(" → ") || "new session"}

${contextBlock
  ? `REAL DATA FROM COMMUNITY DATABASE:\n${contextBlock}`
  : "NO COMMUNITY DATA for this query. Give a cautious general estimate and explicitly state it is not community-verified."}`;

  return systemPrompt;
}

module.exports = { buildContext, buildGroundedPrompt };