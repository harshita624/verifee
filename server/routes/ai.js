const express      = require("express");
const aiController = require("../controllers/aiController");
const aiService     = require("../services/aiService");
const priceEngine   = require("../services/priceEngine");
const travelProviders = require("../services/travelProviders");
const { protect }  = require("../middleware/auth");
const { extractLastPrice, safeLiveReply } = require("../utils/bargainOffer");
const { normalizeCategory, GROUPS } = require("../utils/category");

const router = express.Router();

router.post("/fair-price",        aiController.getFairPrice);
router.post("/scam-check",        aiController.detectScam);
router.post("/translate",         aiController.translate);
router.post("/chat",              aiController.chat);
router.get( "/provider",          aiController.getProviderInfo);
router.post("/recognize-product", protect, aiController.recognizeProduct);
router.post("/parse-receipt",     protect, aiController.parseReceipt);

router.post("/markets-search", async (req, res) => {
  try {
    const query = String(req.body.query || "").trim().slice(0, 100);
    const city = String(req.body.city || "").trim().slice(0, 100);
    const limit = Math.min(30, Math.max(1, Number(req.body.limit) || 12));
    if (!query && !city) return res.status(400).json({ success: false, message: "Enter a market name or city." });
    const data = await travelProviders.searchMarkets(city, query, limit);
    res.set("Cache-Control", "public, max-age=600");
    res.json({ success: true, data, count: data.length, source: "OpenStreetMap", unverified: true });
  } catch (err) {
    res.status(503).json({ success: false, message: err.message || "Market search is temporarily unavailable." });
  }
});

router.get("/city-places/:city", async (req, res) => {
  try {
    const city = String(req.params.city || "").trim().slice(0, 100);
    if (!city) return res.status(400).json({ success: false, message: "City is required." });
    const data = await travelProviders.searchMarkets(city, "", 20);
    res.set("Cache-Control", "public, max-age=600");
    res.json({ success: true, data: data.map(({ name, category }) => ({ name, category, source: "OpenStreetMap", verified: false })) });
  } catch (err) {
    res.status(503).json({ success: false, message: err.message || "Market lookup is temporarily unavailable." });
  }
});

router.post("/bargain-script", async (req, res) => {
  try {
    const { product, city, budget, lang } = req.body;
    if (!product?.trim())
      return res.status(400).json({ success: false, message: "Product required" });

    const langMap = {
      hi:"Hindi",te:"Telugu",ta:"Tamil",kn:"Kannada",
      ml:"Malayalam",mr:"Marathi",bn:"Bengali",
      gu:"Gujarati",pa:"Punjabi",or:"Odia",en:"English",
    };

    const system = `You are a master bargaining coach for Indian markets. Return ONLY valid JSON.`;

    const prompt = `Create a complete bargaining script for buying "${product.trim()}" in ${city||"India"}.
Budget: ${budget?"₹"+budget:"not specified"}. Language: ${langMap[lang]||"Hindi"}.

Return exactly this JSON:
{
  "targetPrice": <realistic aim>,
  "openingOffer": <lower than target>,
  "walkAwayPrice": <maximum to pay>,
  "steps": [
    {"stage":"Enter the shop","say":"<phrase in ${langMap[lang]||"Hindi"}>","romanized":"<pronunciation>","why":"<psychology>","theyMightSay":"<typical response>"},
    {"stage":"First offer","say":"<phrase>","romanized":"<pronunciation>","why":"<why>","theyMightSay":"<response>"},
    {"stage":"They counter high","say":"<counter>","romanized":"<pronunciation>","why":"<why>","theyMightSay":"<response>"},
    {"stage":"They resist","say":"<phrase>","romanized":"<pronunciation>","why":"<why>","theyMightSay":"<response>"},
    {"stage":"Final offer","say":"<firm offer>","romanized":"<pronunciation>","why":"<why>","theyMightSay":"<response>"},
    {"stage":"Walk away","say":"<leaving phrase>","romanized":"<pronunciation>","why":"<why>","theyMightSay":"<they often call back>"}
  ],
  "generalTips": ["<tip1 for ${city||"India"}>","<tip2>","<tip3>"]
}`;

    const raw    = await aiService.callAIRaw(prompt, system, { maxTokens: 3000, timeoutMs: 30000 });
    const result = aiService.parseJSON(raw, {
      requiredFields: ["targetPrice", "openingOffer", "walkAwayPrice", "steps"],
    });

    if (!Array.isArray(result.steps) || result.steps.length === 0) {
      throw new Error("The AI service returned an incomplete script. Please try again.");
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("bargain-script:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/bargain-reply", async (req, res) => {
  try {
    const { product, city, sellerSaid, lang, context } = req.body;
    if (!sellerSaid?.trim())
      return res.status(400).json({ success: false, message: "sellerSaid required" });

    const langMap = {
      hi:"Hindi",te:"Telugu",ta:"Tamil",kn:"Kannada",
      ml:"Malayalam",mr:"Marathi",bn:"Bengali",
      gu:"Gujarati",pa:"Punjabi",or:"Odia",en:"English",
    };

    const sellerPrice = extractLastPrice(sellerSaid);
    if (sellerPrice !== null) {
      return res.json({
        success: true,
        data: safeLiveReply({ sellerPrice, targetPrice: context?.targetPrice, lang }),
      });
    }

    const system = `Real-time bargaining coach. Tourist is in front of seller NOW. Return ONLY valid JSON.`;
    const prompt = `Product: ${product||"item"}, City: ${city||"India"}.
Seller said: "${sellerSaid.trim()}"
Target: ${context?.targetPrice?"₹"+context.targetPrice:"unknown"}
Never recommend paying more than the seller's stated amount or the target. If their amount is at or below the target, recommend accepting it without raising the price. Do not suggest a higher amount, even as a strategy.

Return JSON:
{
  "say": "<exact ${langMap[lang]||"Hindi"} phrase>",
  "romanized": "<English pronunciation>",
  "strategy": "<one sentence why this works>",
  "nextMove": "<what if this fails>"
}`;

    const raw    = await aiService.callAIRaw(prompt, system, { maxTokens: 700, timeoutMs: 20000 });
    const result = aiService.parseJSON(raw, {
      requiredFields: ["say", "strategy"],
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("bargain-reply:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/verify-receipt", async (req, res) => {
  try {
    const imageBase64 = String(req.body.imageBase64 || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const mimeType = String(req.body.mimeType || "image/jpeg").toLowerCase();
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!imageBase64) return res.status(400).json({ success: false, message: "Choose a receipt image first." });
    if (!allowedMimeTypes.has(mimeType)) return res.status(400).json({ success: false, message: "Upload a JPG, PNG, or WebP receipt image." });
    if (imageBase64.length > 11_000_000) return res.status(413).json({ success: false, message: "Receipt images must be 8 MB or smaller." });
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return res.status(400).json({ success: false, message: "The receipt image could not be decoded. Please upload it again." });

    const prompt = `Read the receipt image and EXTRACT only information visibly printed on it. Do not estimate prices, invent missing values, or infer a city from context. Return valid JSON only with this shape: {"merchantName":"", "date":"", "city":"", "currency":"INR", "totalCharged":null, "confidence":0, "items":[{"name":"", "category":"one of food, hotels, transport, textiles, handicrafts, jewelry, electronics, souvenirs, fruits, tickets, other", "quantity":1, "charged":0, "nights":null, "guests":null, "roomType":""}]}. Each item's charged amount must be the line total actually printed, not an estimated fair price. For hotel stays, extract nights, guests, and room type only when printed. Use null for unknown values, [] if no line items can be read, and confidence from 0 to 100. Preserve the printed merchant/product wording. Categorize conservatively; use other if uncertain.`;
    const extracted = await aiService.analyzeImageWithPrompt(imageBase64, prompt, mimeType);
    const rawItems = Array.isArray(extracted.items) ? extracted.items.slice(0, 12) : [];
    const items = rawItems.map((item) => {
      const name = String(item.name || "").trim().slice(0, 100);
      const detected = normalizeCategory(item.category, name);
      const category = Object.prototype.hasOwnProperty.call(GROUPS, detected)
        ? detected
        : normalizeCategory("", name);
      return {
        name,
        category: Object.prototype.hasOwnProperty.call(GROUPS, category) ? category : "other",
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        charged: Number.isFinite(Number(item.charged)) ? Number(item.charged) : null,
        nights: Number.isFinite(Number(item.nights)) && Number(item.nights) > 0 ? Math.min(90, Math.round(Number(item.nights))) : null,
        guests: Number.isFinite(Number(item.guests)) && Number(item.guests) > 0 ? Math.min(20, Math.round(Number(item.guests))) : null,
        roomType: String(item.roomType || "").trim().slice(0, 60),
      };
    }).filter((item) => item.name && item.charged > 0);
    if (!items.length) {
      return res.status(422).json({ success: false, message: "The receipt image was received, but no priced items could be read. Try a sharper photo with the full receipt visible." });
    }

    const city = String(req.body.city || extracted.city || "").trim().slice(0, 80);
    const comparedItems = await Promise.all(items.map(async (item) => {
      if (!city) return { ...item, status: "unavailable", dataSource: null, dataPoints: 0 };
      if (item.category === "hotels" && !item.nights) return { ...item, status: "unavailable", dataSource: null, dataPoints: 0, comparisonNote: "Enter the number of nights to compare a hotel bill against per-night prices." };
      try {
        const details = item.category === "hotels" ? { nights: item.nights, guests: item.guests, roomType: item.roomType } : {};
        const estimate = await priceEngine.estimate({ product: item.name, city, category: item.category, details });
        const units = item.quantity * (item.category === "hotels" ? item.nights : 1);
        const fairMax = estimate.fairMax * units;
        const overUpper = item.charged > fairMax;
        return {
          ...item,
          fairPriceMin: estimate.fairMin * units,
          fairPriceMax: fairMax,
          unitLabel: item.category === "hotels" ? `per-night range × ${item.nights} night(s)` : item.quantity > 1 ? `× ${item.quantity}` : "",
          dataSource: estimate.dataSource,
          dataPoints: estimate.dataPoints,
          confidence: estimate.confidence,
          status: item.charged > fairMax * 1.3 ? "very_high" : overUpper ? "high" : "fair",
        };
      } catch (error) {
        console.warn("receipt price comparison unavailable:", item.name, error.message);
        return { ...item, status: "unavailable", dataSource: null, dataPoints: 0 };
      }
    }));

    const comparable = comparedItems.filter((item) => Number.isFinite(item.fairPriceMax));
    const totalCharged = Number(extracted.totalCharged) > 0
      ? Number(extracted.totalCharged)
      : items.reduce((sum, item) => sum + item.charged, 0);
    const totalFairPriceMin = comparable.reduce((sum, item) => sum + item.fairPriceMin, 0);
    const totalFairPriceMax = comparable.reduce((sum, item) => sum + item.fairPriceMax, 0);
    const overchargedBy = comparable.reduce((sum, item) => sum + Math.max(0, item.charged - item.fairPriceMax), 0);
    const overchargedPercent = totalFairPriceMax > 0 ? Math.round((overchargedBy / totalFairPriceMax) * 100) : null;

    res.json({
      success: true,
      data: {
        merchantName: String(extracted.merchantName || "").trim().slice(0, 100),
        shopName: String(extracted.merchantName || "").trim().slice(0, 100),
        date: String(extracted.date || "").trim().slice(0, 40),
        city,
        currency: String(extracted.currency || "INR").slice(0, 8),
        confidence: Math.max(0, Math.min(100, Number(extracted.confidence) || 0)),
        items: comparedItems,
        totalCharged,
        totalFairPrice: comparable.length ? Math.round((totalFairPriceMin + totalFairPriceMax) / 2) : null,
        totalFairPriceMin: comparable.length ? Math.round(totalFairPriceMin) : null,
        totalFairPriceMax: comparable.length ? Math.round(totalFairPriceMax) : null,
        overchargedBy: comparable.length ? Math.round(overchargedBy) : null,
        overchargedPercent,
        comparisonAvailable: comparable.length > 0,
        advice: !city
          ? "Receipt details were extracted. Add the city to compare with local reference prices."
          : comparable.length
          ? "This is a screening estimate, not proof of overcharging. Keep the original receipt and check item quality, quantity, and location."
          : "Receipt details were extracted, but Verifee has no usable local reference estimate for these items yet.",
      },
    });
  } catch (err) {
    console.error("verify-receipt:", err.message);
    res.status(503).json({ success: false, message: err.message || "Receipt analysis is temporarily unavailable." });
  }
});
module.exports = router;
