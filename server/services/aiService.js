require("dotenv").config();

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const AI_PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";

// IMPORTANT:
// Your current Groq account is using GPT-OSS 20B.
// This is a valid current Groq model.
const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";


// ─────────────────────────────────────────────────────────────────────────────
// GROQ
// ─────────────────────────────────────────────────────────────────────────────

async function callGroq(prompt, systemPrompt, options = {}) {
  if (!GROQ_KEY) {
    throw new Error("AI service is not configured.");
  }

  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const maxTokens = options.maxTokens || 700;

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || GROQ_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    // Keep technical details in server logs only
    console.error("Groq API error:", {
      status: res.status,
      response: errorText,
    });

    // User-friendly message
    if (res.status === 429) {
      throw new Error(
        "AI service is temporarily busy. Please wait a few seconds and try again."
      );
    }

    if (res.status === 401) {
      throw new Error(
        "AI service authentication failed. Please try again later."
      );
    }

    if (res.status === 404) {
      throw new Error(
        "The AI model is temporarily unavailable. Please try again later."
      );
    }

    throw new Error(
      "The AI service is temporarily unavailable. Please try again later."
    );
  }

  const data = await res.json();

  const content = data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    console.error("Groq returned an empty response:", data);

    throw new Error(
      "The AI service did not return a response. Please try again."
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────────────────────
// GROQ WITH HISTORY
// ─────────────────────────────────────────────────────────────────────────────

async function callGroqWithHistory(message, systemPrompt, history = []) {
  if (!GROQ_KEY) {
    throw new Error("AI service is not configured.");
  }

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...history.slice(-10),
    {
      role: "user",
      content: message,
    },
  ];

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 500,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    console.error("Groq history API error:", {
      status: res.status,
      response: errorText,
    });

    if (res.status === 429) {
      throw new Error(
        "AI service is temporarily busy. Please wait a few seconds and try again."
      );
    }

    if (res.status === 401) {
      throw new Error(
        "AI service authentication failed. Please try again later."
      );
    }

    if (res.status === 404) {
      throw new Error(
        "The AI model is temporarily unavailable. Please try again later."
      );
    }

    throw new Error(
      "The AI service is temporarily unavailable. Please try again later."
    );
  }

  const data = await res.json();

  const content = data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    console.error("Groq history returned empty response:", data);

    throw new Error(
      "The AI service did not return a response. Please try again."
    );
  }

  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI
// ─────────────────────────────────────────────────────────────────────────────

async function callOpenAI(
  prompt,
  systemPrompt = "",
  options = {}
) {
  if (!OPENAI_KEY) {
    throw new Error(
      "OPENAI_API_KEY not set in .env"
    );
  }

  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const body = {
    model:
      options.model || "gpt-4o-mini",

    messages,

    temperature:
      options.temperature !== undefined
        ? options.temperature
        : 0.2,

    max_tokens:
      options.maxTokens || 2048,
  };

  if (options.json) {
    body.response_format = {
      type: "json_object",
    };
  }

  const res = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },

      body: JSON.stringify(body),
    }
  );

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `OpenAI error ${res.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `OpenAI returned invalid API JSON`
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "OpenAI returned an empty response"
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(
  prompt,
  systemPrompt = "",
  options = {}
) {
  if (!GEMINI_KEY) {
    throw new Error(
      "GEMINI_API_KEY not set in .env"
    );
  }

  const model =
    options.model || "gemini-1.5-flash";

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${GEMINI_KEY}`;

  const generationConfig = {
    temperature:
      options.temperature !== undefined
        ? options.temperature
        : 0.2,

    maxOutputTokens:
      options.maxTokens || 2048,
  };

  if (options.json) {
    generationConfig.responseMimeType =
      "application/json";
  }

  const res = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],

      generationConfig,
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `Gemini error ${res.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "Gemini returned invalid API JSON"
    );
  }

  const content =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content || !content.trim()) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA
// ─────────────────────────────────────────────────────────────────────────────

async function callOllama(
  prompt,
  systemPrompt = "",
  options = {}
) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const body = {
    model:
      options.model || OLLAMA_MODEL,

    messages,

    stream: false,

    options: {
      temperature:
        options.temperature !== undefined
          ? options.temperature
          : 0.2,

      num_predict:
        options.maxTokens || 2048,
    },
  };

  // Ollama supports JSON format.
  if (options.json) {
    body.format = "json";
  }

  const res = await fetch(
    `${OLLAMA_URL}/api/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    }
  );

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `Ollama error ${res.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "Ollama returned invalid API JSON"
    );
  }

  const content =
    data?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "Ollama returned an empty response"
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────────────────────
// CORE AI DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

async function callAI(
  prompt,
  systemPrompt = "",
  options = {}
) {
  switch (AI_PROVIDER) {
    case "groq":
      return callGroq(
        prompt,
        systemPrompt,
        options
      );

    case "openai":
      return callOpenAI(
        prompt,
        systemPrompt,
        options
      );

    case "gemini":
      return callGemini(
        prompt,
        systemPrompt,
        options
      );

    case "ollama":
      return callOllama(
        prompt,
        systemPrompt,
        options
      );

    default:
      return callGroq(
        prompt,
        systemPrompt,
        options
      );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseJSON(raw) {
  if (raw === null || raw === undefined) {
    throw new Error(
      "No response received from AI"
    );
  }

  if (typeof raw !== "string") {
    return raw;
  }

  let cleaned = raw.trim();

  if (!cleaned) {
    throw new Error(
      "No JSON found in AI response: empty response"
    );
  }

  // Remove markdown fences.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // First attempt: the entire response is JSON.
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with extraction.
  }

  // Find the first object or array.
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");

  let start = -1;

  if (
    objectStart !== -1 &&
    arrayStart !== -1
  ) {
    start = Math.min(
      objectStart,
      arrayStart
    );
  } else if (objectStart !== -1) {
    start = objectStart;
  } else if (arrayStart !== -1) {
    start = arrayStart;
  }

  if (start === -1) {
    throw new Error(
      `No JSON found in AI response: ${cleaned.slice(
        0,
        500
      )}`
    );
  }

  // Try object ending.
  const objectEnd =
    cleaned.lastIndexOf("}") + 1;

  // Try array ending.
  const arrayEnd =
    cleaned.lastIndexOf("]") + 1;

  const end = Math.max(
    objectEnd,
    arrayEnd
  );

  if (end <= start) {
    throw new Error(
      `Incomplete JSON returned by AI: ${cleaned.slice(
        start,
        start + 500
      )}`
    );
  }

  const jsonString =
    cleaned.slice(start, end);

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Invalid JSON returned by AI: ${jsonString.slice(
        0,
        1000
      )}`
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_SYSTEM = `
You are Verifee's AI price engine for Indian markets.

Estimate realistic Indian market prices.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.
Do not explain your answer outside the JSON.
`;

const SCAM_SYSTEM = `
You are Verifee's scam detection AI protecting tourists in India.

Analyze prices realistically.

Return ONLY valid JSON.
No markdown.
No code fences.
`;

const TRANSLATE_SYSTEM = `
You are Verifee's shopping translator for Indian markets.

Return ONLY valid JSON.
No markdown.
No code fences.
`;


// ─────────────────────────────────────────────────────────────────────────────
// FAIR PRICE
// ─────────────────────────────────────────────────────────────────────────────

exports.getFairPrice = async (
  product,
  city,
  category
) => {
  const prompt = `
Estimate the fair market price for:

Product: "${product}"
City: "${city || "India"}"
Category: "${category || "general"}"

Return exactly this JSON object:

{
  "product": "${product}",
  "city": "${city || "India"}",
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "localMarketAvg": 0,
  "onlineAvg": 0,
  "touristPremium": 0,
  "bargainingStart": 0,
  "bargainingTarget": 0,
  "confidenceScore": 0,
  "bestTimeToBuy": "",
  "aiRecommendation": "",
  "scamWarning": "",
  "trend": "Stable",
  "seasonalNote": ""
}

All prices must be INR numbers.
confidenceScore must be between 0 and 100.
touristPremium must be a percentage number.
trend must be Rising, Stable, or Falling.
`;

  const raw = await callAI(
    prompt,
    PRICE_SYSTEM,
    {
      maxTokens: 2048,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────────────────────
// SCAM DETECTION
// ─────────────────────────────────────────────────────────────────────────────

exports.detectScam = async (
  product,
  offeredPrice,
  city
) => {
  const prompt = `
Analyze whether this is likely to be a tourist scam.

Product: ${product}
Offered price: ₹${offeredPrice}
Location: ${city || "India"}

Return exactly this JSON object:

{
  "offeredPrice": ${Number(offeredPrice) || 0},
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "scamProbability": 0,
  "overpricingPercent": 0,
  "verdict": "Safe",
  "explanation": "",
  "negotiationScript": "",
  "walkAwayAdvice": "",
  "alternatives": []
}

Rules:
- scamProbability must be 0-100.
- verdict must be Safe, Suspicious, or Scam.
- alternatives must be an array of strings.
`;

  const raw = await callAI(
    prompt,
    SCAM_SYSTEM,
    {
      maxTokens: 1536,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATION
// ─────────────────────────────────────────────────────────────────────────────

exports.translate = async (
  text,
  targetLang
) => {
  const langMap = {
    hi: "Hindi",
    te: "Telugu",
    ta: "Tamil",
    kn: "Kannada",
    ml: "Malayalam",
    mr: "Marathi",
    bn: "Bengali",
    gu: "Gujarati",
    pa: "Punjabi",
    or: "Odia",
    en: "English",
  };

  const language =
    langMap[targetLang] || targetLang;

  const prompt = `
Translate the following shopping phrase to ${language}:

"${text}"

Return exactly this JSON object:

{
  "original": "${text}",
  "translated": "",
  "romanized": "",
  "language": "${language}",
  "shoppingPhraseType": "other",
  "culturalTip": ""
}

shoppingPhraseType must be one of:
bargaining
greeting
question
complaint
thanks
other
`;

  const raw = await callAI(
    prompt,
    TRANSLATE_SYSTEM,
    {
      maxTokens: 1024,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────────────────

exports.chat = async (
  message,
  context = {},
  history = []
) => {
  const systemPrompt =
    context.systemPrompt ||
    `
You are Verifee's AI shopping assistant for Indian markets.

You help with:
- fair prices
- scam detection
- bargaining
- market information
- shopping translations

Be direct and useful.

Give INR amounts when relevant.

Keep responses under 120 words unless the user asks for more detail.
`;

  // If using Groq, use the history-specific function.
  if (
    AI_PROVIDER === "groq" &&
    Array.isArray(history) &&
    history.length > 0
  ) {
    return callGroqWithHistory(
      message,
      systemPrompt,
      history,
      {
        maxTokens: 1024,
        temperature: 0.4,
      }
    );
  }

  // For other providers, construct the history into the prompt.
  if (
    Array.isArray(history) &&
    history.length > 0
  ) {
    const historyText = history
      .slice(-10)
      .map(
        (item) =>
          `${item.role || "user"}: ${
            item.content || ""
          }`
      )
      .join("\n");

    const prompt = `
Conversation history:

${historyText}

Current user message:

${message}
`;

    return callAI(
      prompt,
      systemPrompt,
      {
        maxTokens: 1024,
        temperature: 0.4,
      }
    );
  }

  return callAI(
    message,
    systemPrompt,
    {
      maxTokens: 1024,
      temperature: 0.4,
    }
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT IMAGE RECOGNITION
// ─────────────────────────────────────────────────────────────────────────────

exports.recognizeProduct = async (
  imageBase64
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "OPENAI_API_KEY required for product image recognition"
    );
  }

  const prompt = `
Identify this product and estimate its fair price
in Indian markets.

Return ONLY valid JSON:

{
  "productName": "",
  "category": "",
  "description": "",
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "authenticityTips": [],
  "commonFakes": "",
  "whereToBuy": [],
  "confidence": 0
}
`;

  const res = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },

      body: JSON.stringify({
        model: "gpt-4o",

        messages: [
          {
            role: "user",

            content: [
              {
                type: "text",
                text: prompt,
              },

              {
                type: "image_url",

                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],

        max_tokens: 1200,

        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `OpenAI vision error ${res.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "OpenAI vision returned invalid API JSON"
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "OpenAI vision returned empty content"
    );
  }

  return parseJSON(content);
};


// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT PARSER
// ─────────────────────────────────────────────────────────────────────────────

exports.parseReceipt = async (
  textOrBase64
) => {
  const text =
    String(textOrBase64 || "").slice(0, 5000);

  const prompt = `
Extract information from this Indian receipt/bill:

"${text}"

Return exactly this JSON object:

{
  "product": "",
  "shopName": "",
  "amount": 0,
  "date": "",
  "city": "",
  "category": "",
  "confidence": 0
}

amount must be an INR number.
confidence must be between 0 and 100.
`;

  const raw = await callAI(
    prompt,
    "You parse Indian shopping receipts. Return ONLY valid JSON.",
    {
      maxTokens: 1024,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────────────────────
// RAW AI CALLER
// ─────────────────────────────────────────────────────────────────────────────

exports.callAIRaw = callAI;


// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

exports.parseJSON = parseJSON;


// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM IMAGE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

exports.analyzeImageWithPrompt = async (
  imageBase64,
  prompt
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "OPENAI_API_KEY required for image analysis"
    );
  }

  const res = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },

      body: JSON.stringify({
        model: "gpt-4o",

        messages: [
          {
            role: "user",

            content: [
              {
                type: "text",
                text: `${prompt}

Return ONLY valid JSON.
No markdown.
No code fences.`,
              },

              {
                type: "image_url",

                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],

        max_tokens: 1200,

        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `OpenAI vision error ${res.status}: ${responseText}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      "OpenAI vision returned invalid API JSON"
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "OpenAI vision returned empty content"
    );
  }

  return parseJSON(content);
};


// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER INFO
// ─────────────────────────────────────────────────────────────────────────────

exports.getProviderInfo = () => {
  let model = "default";

  if (AI_PROVIDER === "groq") {
    model = GROQ_MODEL;
  } else if (AI_PROVIDER === "ollama") {
    model = OLLAMA_MODEL;
  }

  return {
    provider: AI_PROVIDER,
    model,
    status: "active",
  };
};