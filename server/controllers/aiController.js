const aiService  = require("../services/aiService");
const mlService  = require("../services/mlService");
const nlpService = require("../services/nlpService");
const ragService = require("../services/ragService");
const ScamReport = require("../models/ScamReport");

// ── Fair price — city-specific AI prompt ──────────────────────────────────────

exports.getFairPrice = async (req, res) => {
  try {
    const { product, city, category, sessionId } = req.body;
    if (!product?.trim())
      return res.status(400).json({ success: false, message: "Product is required" });

    const sid             = sessionId || "anon";
    const resolvedProduct = product.trim();
    const resolvedCity    = city?.trim() || "";

    nlpService.processQuery(`price of ${resolvedProduct} in ${resolvedCity}`, sid);

    const rag = await ragService.buildContext(resolvedProduct, resolvedCity, null);

    let result;
    if (rag.hasRealData && rag.distribution) {
      const dist  = rag.distribution;
      const trend = rag.trend;

      result = {
        product:          resolvedProduct,
        city:             resolvedCity || "India",
        fairPriceMin:     dist.p25,
        fairPriceMax:     dist.p75,
        localMarketAvg:   dist.median,
        onlineAvg:        Math.round(dist.mean * 0.85),
        touristPremium:   Math.round(((dist.p90 - dist.median) / (dist.median||1)) * 100),
        bargainingStart:  dist.p10,
        bargainingTarget: dist.p25,
        confidenceScore:  Math.min(98, 40 + dist.count * 4),
        dataSource:       "community_verified",
        dataPoints:       dist.count,
        trend:            trend?.trend || "Stable",
        aiRecommendation: "",
        scamWarning:      "",
        seasonalNote:     "",
        bestTimeToBuy:    "",
      };

      const advicePrompt =
        `Product: "${resolvedProduct}", City: "${resolvedCity}". ` +
        `Community data: median ₹${dist.median}, range ₹${dist.p25}–₹${dist.p75}, ` +
        `${dist.count} verified purchases. ` +
        `Give: (1) one specific bargaining tip, (2) scam warning if any, (3) best time to buy. ` +
        `Under 80 words. No emojis.`;

      const advice = await aiService.chat(advicePrompt, {}, []);
      result.aiRecommendation = advice.split("\n")[0] || advice.slice(0,160);

      if (trend?.trend === "Rising")
        result.seasonalNote = `Prices rising — buy soon. Monthly increase approx ₹${trend.monthlyChange||"?"}`;
      else if (trend?.trend === "Falling")
        result.seasonalNote = "Prices falling — you have negotiating power.";
    } else {
      // City-specific AI fallback with explicit city pricing instruction
      const system = `You are a fair price estimator for Indian PHYSICAL markets.
CRITICAL: Give prices that are SPECIFIC to the city provided.
- Mumbai prices are typically 25-40% HIGHER than Delhi
- Jaipur, Varanasi, Agra are 10-25% CHEAPER than Delhi
- Tourist hotspot markets are 30-80% more expensive than local bazaars
- Do NOT give generic all-India prices — give the ACTUAL city price
Return ONLY valid JSON, no markdown.`;

      const prompt = `Estimate fair price for "${resolvedProduct}" in ${resolvedCity||"India"}.
Category: ${category||"general"}

IMPORTANT: Prices must be specific to ${resolvedCity||"India"}, not generic.

Return exactly this JSON:
{
  "product": "${resolvedProduct}",
  "city": "${resolvedCity||"India"}",
  "fairPriceMin": <INR number specific to ${resolvedCity||"India"}>,
  "fairPriceMax": <INR number specific to ${resolvedCity||"India"}>,
  "localMarketAvg": <INR — what locals in ${resolvedCity||"India"} actually pay>,
  "onlineAvg": <INR — online price comparison>,
  "touristPremium": <percentage tourists overpay in this specific city>,
  "bargainingStart": <INR — open negotiation here>,
  "bargainingTarget": <INR — aim to pay this>,
  "confidenceScore": <30-55 since no community data>,
  "bestTimeToBuy": "<when to buy in ${resolvedCity||"India"}>",
  "aiRecommendation": "<city-specific bargaining advice for ${resolvedCity||"India"}>",
  "scamWarning": "<common scam for this product in ${resolvedCity||"India"} or empty>",
  "trend": "<Rising|Stable|Falling>",
  "seasonalNote": "<seasonal factor in ${resolvedCity||"India"} or empty>"
}`;

      const raw = await aiService.callAIRaw(prompt, system, { maxTokens: 800 });
      result = { ...aiService.parseJSON(raw), dataSource: "ai_estimate", dataPoints: 0 };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("getFairPrice:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Scam detection ────────────────────────────────────────────────────────────

exports.detectScam = async (req, res) => {
  try {
    const { product, offeredPrice, city, place, sessionId } = req.body;

    if (!product?.trim() || !offeredPrice || Number(offeredPrice)<=0)
      return res.status(400).json({ success: false, message: "Product and offered price required" });

    const price           = Number(offeredPrice);
    const resolvedProduct = product.trim();
    const resolvedCity    = city?.trim() || "";
    const resolvedPlace   = place?.trim() || "";
    const sid             = sessionId || "anon";

    nlpService.processQuery(`is ₹${price} fair for ${resolvedProduct} in ${resolvedCity}`, sid);

    const [anomaly, distribution, scamHistory] = await Promise.all([
      mlService.detectPriceAnomaly(resolvedProduct, resolvedCity, price),
      mlService.getPriceDistribution(resolvedProduct, resolvedCity),
      ScamReport.find({
        product: { $regex: new RegExp(resolvedProduct.split(" ").join("|"),"i") },
        ...(resolvedCity && { city: { $regex: new RegExp(resolvedCity,"i") } }),
      }).select("severity chargedPrice fairPrice").limit(5).lean(),
    ]);

    let result;
    if (anomaly.hasEnoughData) {
      const zScore = anomaly.zScore;
      const pct    = anomaly.overchargePercent;

      let scamProbability;
      if      (zScore>3)  scamProbability = Math.min(99,85+zScore*3);
      else if (zScore>2)  scamProbability = Math.min(84,60+zScore*12);
      else if (zScore>1)  scamProbability = Math.min(59,30+zScore*18);
      else                scamProbability = Math.max(5, zScore*20);

      if (scamHistory.length>0) scamProbability = Math.min(99,scamProbability+scamHistory.length*5);
      scamProbability = Math.round(scamProbability);

      const verdict = scamProbability>=70?"Scam":scamProbability>=40?"Suspicious":"Fair";
      const communityMedian = distribution?.median || anomaly.mean;

      const scriptPrompt =
        `Product: "${resolvedProduct}", Location: "${resolvedPlace||resolvedCity||"India"}". ` +
        `Quoted: ₹${price}. Community median: ₹${communityMedian}. ` +
        `Overcharged ${pct}%. Verdict: ${verdict}. ` +
        `Write 3 short lines: 1) Exact sentence to say NOW. 2) Walk away advice. ` +
        `3) Two better places nearby. Under 80 words. No emojis.`;

      const scriptText = await aiService.chat(scriptPrompt,{},[]);
      const lines = scriptText.split("\n").filter(Boolean);

      result = {
        offeredPrice: price,
        fairPriceMin: distribution?.p25 || Math.round(anomaly.mean*0.75),
        fairPriceMax: distribution?.p75 || Math.round(anomaly.mean*1.2),
        communityMedian,
        scamProbability,
        overpricingPercent: pct,
        zScore: anomaly.zScore,
        verdict,
        dataPoints: anomaly.dataPoints,
        dataSource: "community_verified",
        explanation:
          `Statistical analysis of ${anomaly.dataPoints} community receipts: ` +
          `Z-score ${anomaly.zScore.toFixed(1)} ` +
          `(${zScore>2?"strongly anomalous":zScore>1?"mildly high":"within normal range"}). ` +
          `Typical buyer pays ₹${anomaly.mean.toLocaleString()}.`,
        negotiationScript:
          lines[0]||`Say: "Fair community price is ₹${communityMedian.toLocaleString()}. I'll pay that."`,
        walkAwayAdvice:
          lines[1]||(scamProbability>60?"Walk away — better options nearby.":"Try negotiating."),
        alternatives: lines.slice(2),
        historicalScamCount: scamHistory.length,
      };
    } else {
      const raw = await aiService.detectScam(resolvedProduct, price, resolvedCity);
      result = {
        ...raw,
        dataSource: "ai_estimate",
        dataPoints: anomaly.dataPoints,
        explanation:
          `Limited community data (${anomaly.dataPoints} reports). ` +
          `AI estimate — contribute your receipt to improve accuracy.`,
      };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("detectScam:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Chat — fully conversational, RAG only when relevant ──────────────────────

const GREETING_RESPONSES = [
  "Hello! I'm Verifee's shopping assistant. I can help you check fair prices, spot scams, bargain in local languages, and find trusted markets across India. What are you shopping for?",
  "Hi there! Ask me anything about shopping in India — fair prices, scam detection, bargaining phrases, or trusted markets. What do you need?",
  "Hey! Happy to help you shop smarter in India. Ask me about fair prices for any product, whether you're being overcharged, or how to bargain effectively.",
];

const THANKS_RESPONSES = [
  "You're welcome! Let me know if you need help with any other price checks or market questions.",
  "Happy to help! If you need to check another price or spot a scam, just ask.",
  "Glad I could help. Safe shopping — and remember, always bargain!",
];

const ABOUT_RESPONSE =
  `Verifee helps travelers in India avoid being overcharged. Here's what I can do:\n` +
  `- Check the fair price for any product in any Indian city\n` +
  `- Detect if a quoted price is a scam (with Z-score analysis)\n` +
  `- Give you bargaining scripts in Hindi and 10 other Indian languages\n` +
  `- Compare prices across multiple cities\n` +
  `- Show trusted markets and their trust scores\n\n` +
  `Try asking: "Is ₹3,500 fair for a Pashmina in Srinagar?" or "How to say 'lower price' in Hindi?"`;

exports.chat = async (req, res) => {
  try {
    const { message, history, sessionId } = req.body;
    if (!message?.trim())
      return res.status(400).json({ success: false, message: "Message required" });

    const sid       = sessionId || req.headers["x-session-id"] || "anon";
    const nlpResult = nlpService.processQuery(message, sid);
    const session   = nlpService.getSession(sid);
    const ctx       = session.getContext();
    const { intent, entities } = nlpResult;

    // ── Handle social/greeting intents without RAG ────────────────────────────
    if (intent === "greeting") {
      const lowerMsg = message.toLowerCase().trim();
      let reply;

      if (/^(thank|thx|ty|thanku|thnk)/i.test(lowerMsg)) {
        reply = THANKS_RESPONSES[Math.floor(Math.random()*THANKS_RESPONSES.length)];
      } else if (/^(bye|goodbye|see you|cya)/i.test(lowerMsg)) {
        reply = "Goodbye! Safe shopping — and remember to always check prices on Verifee before buying!";
      } else if (/^(ok|okay|cool|nice|great|got it|perfect|alright)/i.test(lowerMsg)) {
        reply = ctx.product || ctx.city
          ? `Great! Anything else you'd like to know about ${ctx.product||"shopping"} in ${ctx.city||"India"}?`
          : "Got it! Feel free to ask about any product price, scam check, or bargaining tips.";
      } else {
        reply = GREETING_RESPONSES[Math.floor(Math.random()*GREETING_RESPONSES.length)];
      }

      return res.json({
        success: true,
        data: { reply, meta: { intent, entities, dataSource: "direct", dataPoints: 0 } },
      });
    }

    // ── About/feature questions ───────────────────────────────────────────────
    if (intent === "about") {
      return res.json({
        success: true,
        data: { reply: ABOUT_RESPONSE, meta: { intent, entities, dataSource: "direct", dataPoints: 0 } },
      });
    }

    // ── General with no product and no context ────────────────────────────────
    const hasContext = entities.product || ctx.product || entities.city || ctx.city || entities.price;
    if (!hasContext && intent === "general") {
      const casualSystem =
        `You are Verifee's friendly AI shopping assistant for India. ` +
        `Help travelers avoid tourist overpricing and scams in Indian markets. ` +
        `If the question is unclear, ask what product or city they're asking about. ` +
        `Keep responses under 80 words. No emojis. Be warm and helpful.`;

      const safeHistory = (Array.isArray(history)?history:[]).slice(-6).map(m=>({
        role: m.role==="user"?"user":"assistant",
        content: String(m.content).slice(0,400),
      }));

      const reply = await aiService.chat(message, { systemPrompt: casualSystem }, safeHistory);
      return res.json({
        success: true,
        data: { reply, meta: { intent, entities, dataSource: "direct", dataPoints: 0 } },
      });
    }

    // ── Data-relevant intents — run full RAG pipeline ────────────────────────
    const productToLookup = entities.product || ctx.product;
    const cityToLookup    = entities.city    || ctx.city;
    const dataIntents     = ["price_check","scam_detect","bargain_help","market_info","scam_warning","translate"];

    let ragContext = { hasRealData: false, contextBlock: "" };
    if (productToLookup && dataIntents.includes(intent)) {
      ragContext = await ragService.buildContext(
        productToLookup, cityToLookup||"", entities.price||null
      );
    }

    const systemPrompt = ragService.buildGroundedPrompt(message, ragContext, nlpResult, ctx);

    const safeHistory = (Array.isArray(history)?history:[])
      .slice(-8)
      .map(m=>({ role: m.role==="user"?"user":"assistant", content: String(m.content).slice(0,400) }));

    const reply = await aiService.chat(message, { systemPrompt, city: cityToLookup }, safeHistory);

    res.json({
      success: true,
      data: {
        reply,
        meta: {
          intent, entities,
          dataPoints:     ragContext.dataPoints||0,
          dataSource:     ragContext.hasRealData?"community_verified":"ai_estimate",
          sessionCity:    ctx.city,
          sessionProduct: ctx.product,
        },
      },
    });
  } catch (err) {
    console.error("chat:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Pass-through endpoints ────────────────────────────────────────────────────

exports.translate = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text?.trim()||!targetLang)
      return res.status(400).json({ success: false, message: "text and targetLang required" });
    const result = await aiService.translate(text.trim(), targetLang);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.recognizeProduct = async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64)
      return res.status(400).json({ success: false, message: "imageBase64 required" });
    const result = await aiService.recognizeProduct(imageBase64);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.parseReceipt = async (req, res) => {
  try {
    const { imageBase64, text } = req.body;
    if (!imageBase64&&!text)
      return res.status(400).json({ success: false, message: "imageBase64 or text required" });
    const result = await aiService.parseReceipt(imageBase64||text);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProviderInfo = (req, res) => {
  res.json({ success: true, data: aiService.getProviderInfo() });
};