const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Unified AI abstraction layer — swap providers without touching callers
async function callAI(prompt, systemPrompt = "", options = {}) {
  switch (AI_PROVIDER) {
    case "openai":
      return callOpenAI(prompt, systemPrompt, options);
    case "gemini":
      return callGemini(prompt, systemPrompt, options);
    case "ollama":
      return callOllama(prompt, systemPrompt, options);
    default:
      return callOpenAI(prompt, systemPrompt, options);
  }
}

async function callOpenAI(prompt, systemPrompt, options = {}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 1000,
      response_format: options.json ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt, systemPrompt, options = {}) {
  const model = options.model || "gemini-1.5-flash";
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: options.temperature || 0.3, maxOutputTokens: options.maxTokens || 1000 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOllama(prompt, systemPrompt, options = {}) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model || "llama3.2",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message.content;
}

// High-level AI functions used across the app

export async function estimateFairPrice(product, city, category) {
  const system = `You are Verifee's AI price intelligence engine. You know Indian market prices deeply — local bazaars, tourist markets, fixed-price stores, and online platforms. 
Always respond in valid JSON only. Never add markdown or explanation outside the JSON.`;

  const prompt = `Estimate the fair market price for "${product}" in ${city || "India"}, category: ${category || "general"}.

Return this exact JSON structure:
{
  "product": "${product}",
  "city": "${city || "India"}",
  "fairPriceMin": <number in INR>,
  "fairPriceMax": <number in INR>,
  "localMarketAvg": <number in INR>,
  "onlineAvg": <number in INR>,
  "touristPremium": <percentage tourists typically overpay, e.g. 40>,
  "bargainingStart": <number — start negotiation here>,
  "bargainingTarget": <number — aim to pay this>,
  "confidenceScore": <0-100>,
  "bestTimeToBy": "<when is the best time to buy this>",
  "aiRecommendation": "<specific buying advice in 1-2 sentences>",
  "scamWarning": "<common scam related to this product if any>",
  "trend": "<Rising|Stable|Falling>",
  "seasonalNote": "<seasonal price factor if any>"
}`;

  const raw = await callAI(prompt, system, { json: true });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function detectScam(product, offeredPrice, city) {
  const system = `You are Verifee's scam detection AI. You protect tourists and travelers from price fraud in Indian markets. Respond in valid JSON only.`;

  const prompt = `Analyze if this is a scam:
Product: ${product}
Offered price: ₹${offeredPrice}
Location: ${city || "India"}

Return this exact JSON:
{
  "offeredPrice": ${offeredPrice},
  "fairPriceMin": <number>,
  "fairPriceMax": <number>,
  "scamProbability": <0-100>,
  "overpricingPercent": <how much % higher than fair price>,
  "verdict": "<Safe|Suspicious|Scam>",
  "explanation": "<why this is or isn't overpriced>",
  "negotiationScript": "<exact words to say to the seller in English>",
  "walkAwayAdvice": "<should they walk away? why?>",
  "alternatives": ["<alternative place 1>", "<alternative place 2>"]
}`;

  const raw = await callAI(prompt, system, { json: true });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function translateText(text, targetLang, sourceLang = "auto") {
  const system = `You are a precise shopping translator for Indian markets. You translate naturally and provide the romanized pronunciation too. Respond in valid JSON only.`;

  const langNames = {
    hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada",
    ml: "Malayalam", mr: "Marathi", bn: "Bengali",
    gu: "Gujarati", pa: "Punjabi", or: "Odia", en: "English",
  };

  const prompt = `Translate this text to ${langNames[targetLang] || targetLang}:
"${text}"

Return JSON:
{
  "original": "${text}",
  "translated": "<translation in target language>",
  "romanized": "<how to pronounce it in English letters>",
  "language": "${langNames[targetLang]}",
  "shoppingPhraseType": "<greeting|bargaining|question|complaint|thanks|other>",
  "culturalTip": "<relevant shopping tip for this context>"
}`;

  const raw = await callAI(prompt, system, { json: true });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function chatWithAssistant(message, context = {}) {
  const system = `You are Verifee's AI shopping assistant helping tourists and travelers in India. You help with:
- Fair price estimates for products and services
- Identifying tourist scams and overcharging
- Recommending trusted markets and shops  
- Translating shopping phrases
- Bargaining advice
- Cultural tips for shopping in India

Be concise, practical, and specific. Always mention price ranges in INR. If asked about a specific city or market, be specific about that location.`;

  const contextStr = context.city ? `User is currently in ${context.city}. ` : "";
  return callAI(`${contextStr}${message}`, system, { temperature: 0.5, maxTokens: 500 });
}

export async function recognizeProduct(imageBase64) {
  if (AI_PROVIDER !== "openai") {
    return { error: "Product recognition requires OpenAI with vision." };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Identify this product and estimate its fair price in Indian markets. Return JSON only:
{
  "productName": "<name>",
  "category": "<category>",
  "description": "<brief description>",
  "fairPriceMin": <INR>,
  "fairPriceMax": <INR>,
  "authenticityTips": ["<tip1>", "<tip2>"],
  "commonFakes": "<how to spot fakes if applicable>",
  "whereToBy": ["<market/place 1>", "<market/place 2>"],
  "confidence": <0-100>
}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      }],
      max_tokens: 600,
    }),
  });

  const data = await res.json();
  const content = data.choices[0].message.content;
  return typeof content === "string" ? JSON.parse(content) : content;
}

export default callAI;