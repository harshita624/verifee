require("dotenv").config();

const AI_PROVIDER  = process.env.AI_PROVIDER  || "groq";
const GROQ_KEY     = process.env.GROQ_API_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const GROQ_MODEL   = process.env.GROQ_MODEL   || "llama-3.3-70b-versatile";

// ── Provider implementations ──────────────────────────────────────────────────

async function callGroq(prompt, systemPrompt, options = {}) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set in .env");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       options.model || GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens:  options.maxTokens  || 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGroqWithHistory(message, systemPrompt, history = []) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set in .env");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens:  600,
    }),
  });

  if (!res.ok) throw new Error(`Groq history error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenAI(prompt, systemPrompt, options = {}) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set in .env");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model:           options.model || "gpt-4o-mini",
      messages,
      temperature:     options.temperature ?? 0.2,
      max_tokens:      options.maxTokens || 1024,
      response_format: options.json ? { type: "json_object" } : undefined,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt, systemPrompt, options = {}) {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set in .env");

  const model = options.model || "gemini-1.5-flash";
  const full  = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        contents:         [{ parts: [{ text: full }] }],
        generationConfig: {
          temperature:      options.temperature ?? 0.2,
          maxOutputTokens:  options.maxTokens || 1024,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOllama(prompt, systemPrompt, options = {}) {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model:   options.model || OLLAMA_MODEL,
      messages,
      stream:  false,
      options: {
        temperature:  options.temperature ?? 0.2,
        num_predict:  options.maxTokens || 1024,
      },
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.message.content;
}

// ── Core dispatcher ───────────────────────────────────────────────────────────

async function callAI(prompt, systemPrompt = "", options = {}) {
  switch (AI_PROVIDER) {
    case "groq":   return callGroq(prompt, systemPrompt, options);
    case "openai": return callOpenAI(prompt, systemPrompt, options);
    case "gemini": return callGemini(prompt, systemPrompt, options);
    case "ollama": return callOllama(prompt, systemPrompt, options);
    default:       return callGroq(prompt, systemPrompt, options);
  }
}

// ── JSON parser — strips markdown fences, finds first { or [ ─────────────────

function parseJSON(raw) {
  if (typeof raw !== "string") return raw;

  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.search(/[\[{]/);
  const end   = Math.max(
    cleaned.lastIndexOf("}"),
    cleaned.lastIndexOf("]")
  ) + 1;

  if (start === -1 || end === 0) {
    throw new Error(`No JSON found in AI response: ${cleaned.slice(0, 100)}`);
  }

  return JSON.parse(cleaned.slice(start, end));
}

// ── System prompts ────────────────────────────────────────────────────────────

const PRICE_SYSTEM = `You are Verifee's AI price engine for Indian markets.
You know the difference between tourist prices and local prices.
Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

const SCAM_SYSTEM = `You are Verifee's scam detection AI protecting tourists in India.
Return ONLY valid JSON. No markdown, no explanation.`;

const TRANSLATE_SYSTEM = `You are a shopping translator for Indian markets.
Return ONLY valid JSON. No markdown, no code fences.`;

// ── High-level service functions ──────────────────────────────────────────────

exports.getFairPrice = async (product, city, category) => {
  const prompt = `Estimate fair market price for: "${product}" in ${city || "India"}.
Category: ${category || "general"}

Return exactly this JSON:
{
  "product": "${product}",
  "city": "${city || "India"}",
  "fairPriceMin": <INR number>,
  "fairPriceMax": <INR number>,
  "localMarketAvg": <INR number>,
  "onlineAvg": <INR number>,
  "touristPremium": <percentage>,
  "bargainingStart": <INR number>,
  "bargainingTarget": <INR number>,
  "confidenceScore": <0-60>,
  "bestTimeToBuy": "<string>",
  "aiRecommendation": "<string>",
  "scamWarning": "<string or empty>",
  "trend": "<Rising|Stable|Falling>",
  "seasonalNote": "<string or empty>"
}`;

  const raw = await callAI(prompt, PRICE_SYSTEM, { maxTokens: 800 });
  return parseJSON(raw);
};

exports.detectScam = async (product, offeredPrice, city) => {
  const prompt = `Analyze if this is a tourist scam:
Product: ${product}
Offered price: ₹${offeredPrice}
Location: ${city || "India"}

Return exactly this JSON:
{
  "offeredPrice": ${offeredPrice},
  "fairPriceMin": <INR>,
  "fairPriceMax": <INR>,
  "scamProbability": <0-100>,
  "overpricingPercent": <number>,
  "verdict": "<Safe|Suspicious|Scam>",
  "explanation": "<2-3 sentences>",
  "negotiationScript": "<exact sentence to say>",
  "walkAwayAdvice": "<should they walk away and why>",
  "alternatives": ["<place 1>", "<place 2>"]
}`;

  const raw = await callAI(prompt, SCAM_SYSTEM, { maxTokens: 700 });
  return parseJSON(raw);
};

exports.translate = async (text, targetLang) => {
  const langMap = {
    hi:"Hindi",te:"Telugu",ta:"Tamil",kn:"Kannada",
    ml:"Malayalam",mr:"Marathi",bn:"Bengali",
    gu:"Gujarati",pa:"Punjabi",or:"Odia",en:"English",
  };

  const prompt = `Translate to ${langMap[targetLang] || targetLang}: "${text}"

Return exactly this JSON:
{
  "original": "${text}",
  "translated": "<translation>",
  "romanized": "<English pronunciation>",
  "language": "${langMap[targetLang]}",
  "shoppingPhraseType": "<bargaining|greeting|question|complaint|thanks|other>",
  "culturalTip": "<one practical tip>"
}`;

  const raw = await callAI(prompt, TRANSLATE_SYSTEM, { maxTokens: 400 });
  return parseJSON(raw);
};

// chat — accepts pre-built systemPrompt from RAG controller
exports.chat = async (message, context = {}, history = []) => {
  const systemPrompt = context.systemPrompt ||
    `You are Verifee's AI shopping assistant for Indian markets.
You help with fair prices, scam detection, bargaining, and market info.
Be direct, give specific INR amounts, no emojis, under 120 words unless asked for detail.`;

  if (history.length > 0) {
    return callGroqWithHistory(message, systemPrompt, history);
  }

  return callAI(message, systemPrompt, { temperature: 0.4, maxTokens: 500 });
};

exports.recognizeProduct = async (imageBase64) => {
  if (AI_PROVIDER !== "openai" || !OPENAI_KEY) {
    throw new Error("Product image recognition requires AI_PROVIDER=openai and OPENAI_API_KEY");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model:    "gpt-4o",
      messages: [{
        role:    "user",
        content: [
          {
            type: "text",
            text: `Identify this product and estimate fair price in Indian markets. Return ONLY JSON:
{
  "productName": "<name>",
  "category": "<category>",
  "description": "<brief>",
  "fairPriceMin": <INR>,
  "fairPriceMax": <INR>,
  "authenticityTips": ["<tip1>","<tip2>"],
  "commonFakes": "<how to spot>",
  "whereToBuy": ["<market1>","<market2>"],
  "confidence": <0-100>
}`,
          },
          {
            type:      "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      }],
      max_tokens: 600,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI vision error ${res.status}`);
  const data = await res.json();
  return parseJSON(data.choices[0].message.content);
};

exports.parseReceipt = async (textOrBase64) => {
  const prompt = `Extract from this receipt/bill text: "${textOrBase64.slice(0, 500)}"

Return JSON:
{
  "product": "<main item>",
  "shopName": "<shop if visible>",
  "amount": <total INR number>,
  "date": "<date if visible>",
  "city": "<city if visible>",
  "category": "<category>",
  "confidence": <0-100>
}`;

  const raw = await callAI(
    prompt,
    "You parse Indian shopping receipts. Return ONLY valid JSON.",
    { maxTokens: 300 }
  );
  return parseJSON(raw);
};

// ── Exports needed by routes and other services ───────────────────────────────

// Expose raw AI caller for route-level prompt building (bargain coach etc.)
exports.callAIRaw = callAI;

// Expose JSON parser for route-level use
exports.parseJSON = parseJSON;

// Analyse image with a fully custom prompt (used by receipt verifier)
exports.analyzeImageWithPrompt = async (imageBase64, prompt) => {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY required for image analysis");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model:    "gpt-4o",
      messages: [{
        role:    "user",
        content: [
          { type: "text",      text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI vision error ${res.status}`);
  const data = await res.json();
  return parseJSON(data.choices[0].message.content);
};

exports.getProviderInfo = () => ({
  provider: AI_PROVIDER,
  model:    AI_PROVIDER === "groq"   ? GROQ_MODEL
          : AI_PROVIDER === "ollama" ? OLLAMA_MODEL
          : "default",
  status: "active",
});