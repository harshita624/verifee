require("dotenv").config();

// ============================================================
// CONFIGURATION
// ============================================================

const AI_PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";


// ============================================================
// HELPER - USER FRIENDLY ERRORS
// ============================================================

function getAIErrorMessage(status) {
  switch (status) {
    case 400:
      return "The AI could not process this request. Please try again.";

    case 401:
      return "The AI service could not be authenticated. Please try again later.";

    case 403:
      return "The AI service is currently unavailable for this request.";

    case 404:
      return "The AI model is temporarily unavailable. Please try again later.";

    case 408:
      return "The AI service took too long to respond. Please try again.";

    case 429:
      return "The AI service is temporarily busy. Please wait a few seconds and try again.";

    case 500:
    case 502:
    case 503:
    case 504:
      return "The AI service is temporarily unavailable. Please try again later.";

    default:
      return "The AI service is temporarily unavailable. Please try again later.";
  }
}


// ============================================================
// GROQ
// ============================================================

async function callGroq(prompt, systemPrompt, options = {}) {
  if (!GROQ_KEY) {
    throw new Error("GROQ_API_KEY not set in .env");
  }

  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }

  // FIX: history now flows through here too, so chat() no longer needs a separate Groq-only path
  if (options.history && options.history.length > 0) {
    messages.push(...options.history.slice(-10));
  }

  messages.push({
    role: "user",
    content: prompt
  });

  const maxTokens = options.maxTokens || 1000;

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: options.model || GROQ_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: maxTokens
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    // FIX: this was captured but never logged before, unlike every other provider function
    console.error("Groq API error:", {
      status: res.status,
      response: errorText
    });

    if (res.status === 429) {
      throw new Error(
        "The AI service is temporarily busy due to high usage. Please try again in a few seconds."
      );
    }

    if (res.status === 404) {
      throw new Error(
        "The configured AI model is unavailable. Please try again later."
      );
    }

    if (res.status === 401) {
      throw new Error(
        "The AI service authentication failed. Please check the API configuration."
      );
    }

    // FIX: was a single hardcoded string before, ignoring getAIErrorMessage's other status cases (400/403/408/5xx)
    throw new Error(getAIErrorMessage(res.status));
  }

  const data = await res.json();

  const content = data.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The AI service did not return a usable response. Please try again."
    );
  }

  // FIX: added .trim() for consistency with every other provider function
  return content.trim();
}


// ============================================================
// OPENAI
// ============================================================

async function callOpenAI(prompt, systemPrompt, options = {}) {
  if (!OPENAI_KEY) {
    throw new Error("AI service is not configured.");
  }

  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // FIX: OpenAI can now carry conversation history too
  if (options.history && options.history.length > 0) {
    messages.push(...options.history.slice(-10));
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const body = {
    model: options.model || "gpt-4o-mini",
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens || 1200,
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

  if (!res.ok) {
    const errorText = await res.text();

    console.error("OpenAI API error:", {
      status: res.status,
      response: errorText,
    });

    throw new Error(getAIErrorMessage(res.status));
  }

  const data = await res.json();

  const content = data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The AI service could not complete the response. Please try again."
    );
  }

  return content.trim();
}


// ============================================================
// GEMINI
// ============================================================

async function callGemini(prompt, systemPrompt, options = {}) {
  if (!GEMINI_KEY) {
    throw new Error("AI service is not configured.");
  }

  const model = options.model || "gemini-1.5-flash";

  // FIX: Gemini can now carry conversation history too, folded into the prompt
  // as a transcript (kept consistent with this file's existing single-fullPrompt
  // approach for Gemini, rather than switching to Gemini's native multi-turn
  // `contents` array, which would be a bigger structural change).
  let historyText = "";
  if (options.history && options.history.length > 0) {
    historyText =
      options.history
        .slice(-10)
        .map(
          (m) =>
            `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`
        )
        .join("\n") + "\n\n";
  }

  const fullPrompt = `${
    systemPrompt ? systemPrompt + "\n\n" : ""
  }${historyText}${prompt}`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${GEMINI_KEY}`;

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

      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens || 1200,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();

    console.error("Gemini API error:", {
      status: res.status,
      response: errorText,
    });

    throw new Error(getAIErrorMessage(res.status));
  }

  const data = await res.json();

  const content =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content || !content.trim()) {
    throw new Error(
      "The AI service could not complete the response. Please try again."
    );
  }

  return content.trim();
}


// ============================================================
// OLLAMA
// ============================================================

async function callOllama(prompt, systemPrompt, options = {}) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // FIX: Ollama can now carry conversation history too
  if (options.history && options.history.length > 0) {
    messages.push(...options.history.slice(-10));
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,

      messages,

      stream: false,

      options: {
        temperature: options.temperature ?? 0.2,
        num_predict: options.maxTokens || 1200,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();

    console.error("Ollama API error:", {
      status: res.status,
      response: errorText,
    });

    throw new Error(getAIErrorMessage(res.status));
  }

  const data = await res.json();

  const content = data?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The AI service could not complete the response. Please try again."
    );
  }

  return content.trim();
}


// ============================================================
// CORE AI DISPATCHER
// ============================================================

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


// ============================================================
// ROBUST JSON PARSER
// ============================================================

function parseJSON(raw) {
  if (raw && typeof raw === "object") {
    return raw;
  }

  if (typeof raw !== "string") {
    throw new Error(
      "The AI service returned an invalid response. Please try again."
    );
  }

  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!cleaned) {
    throw new Error(
      "The AI service returned an empty response. Please try again."
    );
  }

  // First attempt: entire response is JSON
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Continue to extraction
  }

  // Find first object or array
  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");

  let start;

  if (objectStart === -1) {
    start = arrayStart;
  } else if (arrayStart === -1) {
    start = objectStart;
  } else {
    start = Math.min(objectStart, arrayStart);
  }

  if (start === -1) {
    console.error(
      "No JSON start found. AI response:",
      cleaned.slice(0, 500)
    );

    throw new Error(
      "The AI service returned an unexpected response. Please try again."
    );
  }

  const objectEnd = cleaned.lastIndexOf("}");
  const arrayEnd = cleaned.lastIndexOf("]");

  const end = Math.max(objectEnd, arrayEnd);

  if (end < start) {
    console.error(
      "Incomplete JSON response:",
      cleaned.slice(0, 500)
    );

    throw new Error(
      "The AI service could not complete the response. Please try again."
    );
  }

  const jsonString = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(
      "Invalid JSON returned by AI:",
      jsonString.slice(0, 1000)
    );

    throw new Error(
      "The AI service returned invalid data. Please try again."
    );
  }
}


// ============================================================
// SYSTEM PROMPTS
// ============================================================

const PRICE_SYSTEM = `
You are Verifee's AI price engine for Indian markets.

Estimate realistic Indian local-market prices.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use markdown.
- Do not use code fences.
- Do not explain your reasoning.
- Keep strings short.
- Use INR numbers only for prices.
`;

const SCAM_SYSTEM = `
You are Verifee's scam detection AI for Indian markets.

Analyze the offered price fairly and conservatively.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use markdown.
- Do not use code fences.
- Do not explain your reasoning.
- Keep explanations concise.
`;

const TRANSLATE_SYSTEM = `
You are Verifee's shopping translator for Indian markets.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use markdown.
- Do not use code fences.
- Keep the translation concise.
`;


// ============================================================
// FAIR PRICE
// ============================================================

exports.getFairPrice = async (
  product,
  city,
  category
) => {
  const prompt = `
Estimate the fair local-market price for:

Product: "${product}"
City: ${city || "India"}
Category: ${category || "general"}

Return exactly one JSON object with these fields:

{
  "product": "string",
  "city": "string",
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "localMarketAvg": 0,
  "onlineAvg": 0,
  "touristPremium": 0,
  "bargainingStart": 0,
  "bargainingTarget": 0,
  "confidenceScore": 0,
  "bestTimeToBuy": "string",
  "aiRecommendation": "string",
  "scamWarning": "string",
  "trend": "Stable",
  "seasonalNote": "string"
}

Rules:
- All price fields must be numbers.
- confidenceScore must be between 0 and 60.
- touristPremium must be a percentage number.
- trend must be Rising, Stable, or Falling.
- No extra fields.
`;

  const raw = await callAI(
    prompt,
    PRICE_SYSTEM,
    {
      maxTokens: 1400,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ============================================================
// SCAM DETECTION
// ============================================================

exports.detectScam = async (
  product,
  offeredPrice,
  city
) => {
  const prompt = `
Analyze this Indian-market purchase:

Product: ${product}
Offered price: ₹${offeredPrice}
Location: ${city || "India"}

Return exactly one JSON object:

{
  "offeredPrice": 0,
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "scamProbability": 0,
  "overpricingPercent": 0,
  "verdict": "Safe",
  "explanation": "string",
  "negotiationScript": "string",
  "walkAwayAdvice": "string",
  "alternatives": ["string", "string"]
}

Rules:
- All prices must be numbers.
- scamProbability must be 0-100.
- overpricingPercent must be a number.
- verdict must be Safe, Suspicious, or Scam.
- Keep explanation to 2 short sentences.
- No extra fields.
`;

  const raw = await callAI(
    prompt,
    SCAM_SYSTEM,
    {
      maxTokens: 800,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ============================================================
// TRANSLATION
// ============================================================

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
Translate this shopping phrase to ${language}:

"${text}"

Return exactly:

{
  "original": "string",
  "translated": "string",
  "romanized": "string",
  "language": "string",
  "shoppingPhraseType": "other",
  "culturalTip": "string"
}

shoppingPhraseType must be:
bargaining, greeting, question, complaint, thanks, or other.

No extra fields.
`;

  const raw = await callAI(
    prompt,
    TRANSLATE_SYSTEM,
    {
      maxTokens: 500,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ============================================================
// CHAT
// ============================================================

exports.chat = async (
  message,
  context = {},
  history = []
) => {
  const systemPrompt =
    context.systemPrompt ||
    `
You are Verifee's AI shopping assistant for Indian markets.

Help users with:
- fair prices
- scam detection
- bargaining
- Indian markets
- shopping information

Be direct and concise.
Use specific INR amounts when appropriate.
Keep responses under 120 words unless the user asks for detail.
`;

  // FIX: this used to branch to callGroqWithHistory() — a Groq-only function —
  // whenever history existed, silently ignoring AI_PROVIDER. Now it always goes
  // through callAI(), so it actually respects whichever provider is configured,
  // with or without history.
  return callAI(
    message,
    systemPrompt,
    {
      temperature: 0.4,
      maxTokens: 600,
      history,
    }
  );
};


// ============================================================
// PRODUCT IMAGE RECOGNITION
// ============================================================

exports.recognizeProduct = async (
  imageBase64
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "Product image recognition is currently unavailable."
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

                text: `
Identify this product and estimate its fair price in Indian markets.

Return ONLY JSON:

{
  "productName": "string",
  "category": "string",
  "description": "string",
  "fairPriceMin": 0,
  "fairPriceMax": 0,
  "authenticityTips": ["string"],
  "commonFakes": "string",
  "whereToBuy": ["string"],
  "confidence": 0
}
`,
              },

              {
                type: "image_url",

                image_url: {
                  url:
                    `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],

        max_tokens: 800,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    console.error("OpenAI vision error:", {
      status: res.status,
      response: errorText,
    });

    throw new Error(
      "Image analysis is temporarily unavailable. Please try again later."
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The image could not be analyzed. Please try again."
    );
  }

  return parseJSON(content);
};


// ============================================================
// RECEIPT PARSING
// ============================================================

exports.parseReceipt = async (
  textOrBase64
) => {
  const text =
    String(textOrBase64 || "").slice(0, 500);

  const prompt = `
Extract information from this Indian shopping receipt:

"${text}"

Return exactly:

{
  "product": "string",
  "shopName": "string",
  "amount": 0,
  "date": "string",
  "city": "string",
  "category": "string",
  "confidence": 0
}

If a value is unavailable, use an empty string.
`;

  const raw = await callAI(
    prompt,
    "You parse Indian shopping receipts. Return ONLY valid JSON.",
    {
      maxTokens: 500,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ============================================================
// RAW AI CALL
// ============================================================

exports.callAIRaw = callAI;


// ============================================================
// JSON PARSER EXPORT
// ============================================================

exports.parseJSON = parseJSON;


// ============================================================
// IMAGE ANALYSIS WITH CUSTOM PROMPT
// ============================================================

exports.analyzeImageWithPrompt = async (
  imageBase64,
  prompt
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "Image analysis is currently unavailable."
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
                text: prompt,
              },

              {
                type: "image_url",

                image_url: {
                  url:
                    `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],

        max_tokens: 1000,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    console.error("OpenAI image analysis error:", {
      status: res.status,
      response: errorText,
    });

    throw new Error(
      "Image analysis is temporarily unavailable. Please try again later."
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The image could not be analyzed. Please try again."
    );
  }

  return parseJSON(content);
};


// ============================================================
// PROVIDER INFORMATION
// ============================================================

exports.getProviderInfo = () => ({
  provider: AI_PROVIDER,

  model:
    AI_PROVIDER === "groq"
      ? GROQ_MODEL
      : AI_PROVIDER === "ollama"
      ? OLLAMA_MODEL
      : "default",

  status: "active",
});