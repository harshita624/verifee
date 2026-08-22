const express      = require("express");
const aiController = require("../controllers/aiController");
const aiService     = require("../services/aiService");
const { protect }  = require("../middleware/auth");

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
    const { query, city, limit = 8 } = req.body;

    const system = `You are a database of real Indian markets and bazaars. 
Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Include only REAL, well-known markets. Be accurate about locations and products.`;

    const cityContext = city ? `in or near ${city}` : "across major Indian cities";
    const queryContext = query ? `matching or related to "${query}"` : "popular with tourists and locals";

    const prompt = `List ${limit} real Indian markets ${cityContext} that are ${queryContext}.

Return ONLY this JSON array (no other text):
[
  {
    "id": "<slug like 'crawford-market' or 'johari-bazaar'>",
    "name": "<exact real market name>",
    "city": "<city>",
    "state": "<Indian state>",
    "category": "<main category: Textiles|Jewellery|Handicrafts|Food|Electronics|Mixed|Vegetables|Antiques>",
    "description": "<2-3 sentences: what is sold here, why tourists visit, any notable facts>",
    "trustScore": <number 55-92>,
    "fairPriceScore": <number 50-88>,
    "touristFriendlyScore": <number 55-95>,
    "avgRating": <number 3.6-4.8>,
    "totalReviews": <number 200-6000>,
    "negotiationSuccessRate": <number 45-85>,
    "peakHours": ["<morning time>", "<evening time>"],
    "languages": ["Hindi", "<local language>", "English"],
    "popularProducts": ["<product1>", "<product2>", "<product3>", "<product4>"],
    "openNow": <true or false>,
    "openingHours": "<e.g. 10:00 AM – 8:00 PM>",
    "isVerified": true,
    "color": "<one of: #16a34a|#0ea5e9|#8b5cf6|#f59e0b|#ec4899|#f97316|#14b8a6|#dc2626>"
  }
]`;

    const raw     = await aiService.callAIRaw(prompt, system, { maxTokens: 2500 });
    const markets = aiService.parseJSON(raw);

    if (!Array.isArray(markets) || markets.length === 0) {
      throw new Error("AI returned no markets. Please try again.");
    }

    res.json({ success: true, data: markets, count: markets.length });
  } catch (err) {
    console.error("markets-search:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/city-places/:city", async (req, res) => {
  try {
    const { city } = req.params;
    if (!city) return res.status(400).json({ success: false, message: "city required" });

    const system = `You list real Indian shopping places. Return ONLY valid JSON array.`;

    const prompt = `List 8 real popular shopping markets, bazaars, and areas in ${city}, India.
Return ONLY this JSON array:
[
  {
    "name": "<exact market/area name>",
    "category": "<what is mainly sold>",
    "touristRisk": "<low|medium|high — how likely tourists are overcharged here>"
  }
]`;

    const raw    = await aiService.callAIRaw(prompt, system, { maxTokens: 600 });
    const places = aiService.parseJSON(raw);

    if (!Array.isArray(places) || places.length === 0) {
      throw new Error("AI returned no places. Please try again.");
    }

    res.json({ success: true, data: places });
  } catch (err) {
    console.error("city-places:", err.message);
    res.status(500).json({ success: false, message: err.message });
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

    const raw    = await aiService.callAIRaw(prompt, system, { maxTokens: 3000 });
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

    const system = `Real-time bargaining coach. Tourist is in front of seller NOW. Return ONLY valid JSON.`;
    const prompt = `Product: ${product||"item"}, City: ${city||"India"}.
Seller said: "${sellerSaid.trim()}"
Target: ${context?.targetPrice?"₹"+context.targetPrice:"unknown"}

Return JSON:
{
  "say": "<exact ${langMap[lang]||"Hindi"} phrase>",
  "romanized": "<English pronunciation>",
  "strategy": "<one sentence why this works>",
  "nextMove": "<what if this fails>"
}`;

    const raw    = await aiService.callAIRaw(prompt, system, { maxTokens: 700 });
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
    const { imageBase64 } = req.body;
    if (!imageBase64)
      return res.status(400).json({ success: false, message: "imageBase64 required" });

    const prompt = `Analyze this Indian market receipt. Compare charged prices vs fair market prices.
Return ONLY this JSON:
{
  "items": [{"name":"<item>","charged":<number>,"fairPriceMin":<INR>,"fairPriceMax":<INR>,"status":"<fair|high|very_high>"}],
  "totalCharged": <number>,
  "totalFairPrice": <number>,
  "overchargedBy": <number>,
  "overchargedPercent": <number>,
  "advice": "<what customer can do>",
  "shopName": "<or empty>",
  "date": "<or empty>"
}`;

    let result;
    if (process.env.AI_PROVIDER==="openai"&&process.env.OPENAI_API_KEY) {
      result = await aiService.analyzeImageWithPrompt(imageBase64, prompt);
    } else {
      result = {
        items:[],"totalCharged":0,"totalFairPrice":null,
        "overchargedBy":null,"overchargedPercent":null,
        "advice":"Set AI_PROVIDER=openai in server/.env for full receipt image analysis.",
        "shopName":"","date":"",
      };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("verify-receipt:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;