const aiService  = require("../services/aiService");
const nlpService = require("../services/nlpService");
const ragService = require("../services/ragService");
const priceEngine = require("../services/priceEngine");

const fail = (res, err, tag) => {
  console.error(`${tag}:`, err.message);
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
};

// ── Fair price ────────────────────────────────────────────────────────────────
// FIX: this used a different prompt than the Scam Detector and the Pay Guard, so
// the same item got three different fair ranges. All three now call priceEngine.

const toFairPriceResponse = (est, displayProduct, displayCity) => ({
  product:          displayProduct,
  city:             displayCity || "India",
  fairPriceMin:     est.fairMin,
  fairPriceMax:     est.fairMax,
  localMarketAvg:   est.median,
  onlineAvg:        est.onlineAvg,
  touristPremium:   est.touristPremium,
  bargainingStart:  est.bargainingStart,
  bargainingTarget: est.bargainingTarget,
  confidenceScore:  est.confidence,
  dataSource:       est.dataSource,
  dataPoints:       est.dataPoints,
  trend:            est.trend,
  aiRecommendation: est.aiRecommendation,
  scamWarning:      est.scamWarning,
  seasonalNote:     est.seasonalNote,
  bestTimeToBuy:    est.bestTimeToBuy,
  hint:             est.hint,
});

exports.getFairPrice = async (req, res) => {
  try {
    const { product, city, category, sessionId } = req.body;
    if (!product?.trim())
      return res.status(400).json({ success: false, message: "Product is required" });

    const sid             = sessionId || "anon";
    const resolvedProduct = product.trim();
    const resolvedCity    = city?.trim() || "";

    nlpService.processQuery(`price of ${resolvedProduct} in ${resolvedCity}`, sid);

    const est = await priceEngine.estimate({
      product:  resolvedProduct,
      city:     resolvedCity,
      category: typeof category === "string" ? category : "",
    });

    res.json({ success: true, data: toFairPriceResponse(est, resolvedProduct, resolvedCity) });
  } catch (err) {
    fail(res, err, "getFairPrice");
  }
};

// ── Scam detection ────────────────────────────────────────────────────────────
// The probability and verdict come from priceEngine.judge (numbers only).
// The LLM is used ONLY to write the negotiation words.

exports.detectScam = async (req, res) => {
  try {
    const { product, offeredPrice, city, place, sessionId } = req.body;

    if (!product?.trim() || !offeredPrice || Number(offeredPrice) <= 0)
      return res.status(400).json({ success: false, message: "Product and offered price required" });

    const price           = Number(offeredPrice);
    const resolvedProduct = product.trim();
    const resolvedCity    = city?.trim() || "";
    const resolvedPlace   = place?.trim() || "";
    const sid             = sessionId || "anon";

    nlpService.processQuery(`is ₹${price} fair for ${resolvedProduct} in ${resolvedCity}`, sid);

    const a   = await priceEngine.assess({
      product: resolvedProduct, city: resolvedCity, place: resolvedPlace, price,
    });
    const est = a.est;
    const fmt = (n) => Number(n).toLocaleString("en-IN");

    let negotiationScript =
      `Say: "The usual price for this is around ₹${fmt(est.fairMax)}. I'll pay ₹${fmt(est.bargainingTarget)}."`;
    let walkAwayAdvice =
      a.scamProbability >= 60 ? "Walk away. You can find better prices nearby." : "Try negotiating before you decide.";
    let alternatives = [];

    try {
      const raw = await aiService.callAIRaw(
        `Product: "${est.product}". Location: ${resolvedPlace || resolvedCity || "India"}.\n` +
          `Quoted: ₹${price}. Fair range: ₹${est.fairMin}–₹${est.fairMax} ` +
          `(${est.dataSource === "community_verified" ? `${est.dataPoints} verified community receipts` : "AI estimate"}). ` +
          `Verdict: ${a.verdict}.\n` +
          `Return JSON: {"say":"<one sentence to say to the seller right now>","walkAway":"<one sentence: should they walk away>","alternatives":["<better place nearby 1>","<better place nearby 2>"]}`,
        "You coach tourists bargaining in Indian markets. Return ONLY valid JSON. No emojis.",
        { maxTokens: 700, temperature: 0.2, timeoutMs: 20000, json: true }
      );
      const r = aiService.parseJSON(raw, { requiredFields: ["say"] });
      negotiationScript = String(r.say).slice(0, 300);
      if (r.walkAway) walkAwayAdvice = String(r.walkAway).slice(0, 300);
      if (Array.isArray(r.alternatives)) alternatives = r.alternatives.map((s) => String(s).slice(0, 120)).slice(0, 3);
    } catch (e) {
      console.warn("detectScam: script generation failed, using fallback:", e.message);
    }

    const community = est.dataSource === "community_verified";
    const explanation = community
      ? `Statistical analysis of ${est.dataPoints} community receipts` +
        `${a.zScore !== null ? `: Z-score ${a.zScore.toFixed(1)}` : ""}. Typical buyer pays ₹${fmt(Math.round(est.mean))}.`
      : `Limited community data. AI estimate of ₹${fmt(est.fairMin)}–₹${fmt(est.fairMax)} for this market. ` +
        `Contribute your receipt to improve accuracy.`;

    const result = {
      offeredPrice:        price,
      fairPriceMin:        est.fairMin,
      fairPriceMax:        est.fairMax,
      scamProbability:     a.scamProbability,
      overpricingPercent:  Math.max(0, a.overpricingPercent),
      verdict:             a.verdict,
      dataPoints:          est.dataPoints,
      dataSource:          est.dataSource,
      explanation,
      negotiationScript,
      walkAwayAdvice,
      alternatives,
      historicalScamCount: a.scamHistory,
      hint:                est.hint,
    };
    if (community) {
      result.communityMedian = est.median;
      if (a.zScore !== null) result.zScore = a.zScore;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    fail(res, err, "detectScam");
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