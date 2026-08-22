require("dotenv").config();

const AI_PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";

const MAX_CONCURRENT_AI_REQUESTS = Number(process.env.MAX_CONCURRENT_AI_REQUESTS) || 2;
let activeAIRequests = 0;
const aiRequestQueue = [];

function acquireAISlot() {
  if (activeAIRequests < MAX_CONCURRENT_AI_REQUESTS) {
    activeAIRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    aiRequestQueue.push(resolve);
  });
}

function releaseAISlot() {
  activeAIRequests--;
  const next = aiRequestQueue.shift();
  if (next) {
    activeAIRequests++;
    next();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt, baseDelayMs) {
  const jitter = Math.random() * 250;
  return baseDelayMs * Math.pow(2, attempt) + jitter;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

async function fetchWithRetry(url, fetchOptions, { retries = 2, baseDelayMs = 800, timeoutMs = 15000 } = {}) {
  await acquireAISlot();

  try {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      let res;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      } catch (err) {
        clearTimeout(timeoutId);

        const isTimeout = err.name === "AbortError";
        lastError = err;

        // FIX: timeouts used to throw immediately with no retry, even though
        // a slow response is often just a transient blip. Now they're treated
        // like any other retryable failure, and only give up on the final
        // attempt. This was the root cause of the "continuous errors" on
        // markets-search — one slow generation used to kill the search
        // permanently with no second chance.
        if (attempt === retries) {
          if (isTimeout) {
            console.error(`AI request to ${url} timed out after ${timeoutMs}ms — no attempts left.`);
            throw new Error("The AI service took too long to respond. Please try again.");
          }
          console.error(`AI request to ${url} failed with a network error, no attempts left: ${err.message}`);
          throw new Error("The AI service is temporarily unavailable. Please try again later.");
        }

        console.warn(
          `AI request to ${url} ${isTimeout ? "timed out" : "failed with a network error"}, ` +
          `retrying (attempt ${attempt + 1}/${retries}): ${err.message}`
        );

        await sleep(backoffDelay(attempt, baseDelayMs));
        continue;
      }

      clearTimeout(timeoutId);

      if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt === retries) {
        return res;
      }

      let delay = backoffDelay(attempt, baseDelayMs);
      const retryAfterHeader = res.headers.get("retry-after");
      if (retryAfterHeader) {
        const retryAfterMs = Number(retryAfterHeader) * 1000;
        if (!Number.isNaN(retryAfterMs) && retryAfterMs > 0) {
          delay = Math.max(delay, retryAfterMs);
        }
      }

      console.warn(
        `AI request to ${url} got status ${res.status}, retrying in ${Math.round(delay)}ms ` +
        `(attempt ${attempt + 1}/${retries})`
      );

      await sleep(delay);
    }

    throw lastError || new Error("Request failed after retries");
  } finally {
    releaseAISlot();
  }
}

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

  if (options.history && options.history.length > 0) {
    messages.push(...options.history.slice(-10));
  }

  messages.push({
    role: "user",
    content: prompt
  });

  const maxTokens = options.maxTokens || 1000;

  const res = await fetchWithRetry(
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
    },
    { timeoutMs: options.timeoutMs }
  );

  if (!res.ok) {
    const errorText = await res.text();

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

    throw new Error(getAIErrorMessage(res.status));
  }

  const data = await res.json();

  const content = data.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error(
      "The AI service did not return a usable response. Please try again."
    );
  }

  return content.trim();
}

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

  const res = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },

      body: JSON.stringify(body),
    },
    { timeoutMs: options.timeoutMs }
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

async function callGemini(prompt, systemPrompt, options = {}) {
  if (!GEMINI_KEY) {
    throw new Error("AI service is not configured.");
  }

  const model = options.model || "gemini-1.5-flash";

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

  const res = await fetchWithRetry(
    url,
    {
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
    },
    { timeoutMs: options.timeoutMs }
  );

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

async function callOllama(prompt, systemPrompt, options = {}) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  if (options.history && options.history.length > 0) {
    messages.push(...options.history.slice(-10));
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetchWithRetry(
    `${OLLAMA_URL}/api/chat`,
    {
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
    },
    { timeoutMs: options.timeoutMs }
  );

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

function attemptArrayRepair(jsonString) {
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith("[")) {
    return null;
  }

  let depth = 0;
  let lastCompleteIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth++;
    }

    if (char === "}") {
      depth--;
      if (depth === 0) {
        lastCompleteIndex = i;
      }
    }
  }

  if (lastCompleteIndex === -1) {
    return null;
  }

  const repaired = trimmed.slice(0, lastCompleteIndex + 1) + "]";

  try {
    const parsed = JSON.parse(repaired);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (_) {
    return null;
  }
}

function attemptObjectRepair(jsonString) {
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let lastSafeCutIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{" || char === "[") {
      depth++;
    }

    if (char === "}" || char === "]") {
      depth--;
    }

    if (char === "," && depth === 1) {
      lastSafeCutIndex = i;
    }
  }

  if (lastSafeCutIndex === -1) {
    return null;
  }

  const repaired = trimmed.slice(0, lastSafeCutIndex) + "}";

  try {
    const parsed = JSON.parse(repaired);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function attemptJSONRepair(jsonString) {
  const trimmed = jsonString.trim();
  if (trimmed.startsWith("[")) {
    return attemptArrayRepair(trimmed);
  }
  if (trimmed.startsWith("{")) {
    return attemptObjectRepair(trimmed);
  }
  return null;
}

function assertRequiredFields(result, requiredFields) {
  if (!requiredFields || requiredFields.length === 0) {
    return;
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return;
  }

  const missing = requiredFields.filter((field) => {
    const value = result[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    console.error(
      `AI response is missing required field(s): ${missing.join(", ")}. ` +
      `Result had keys: ${Object.keys(result).join(", ")}`
    );
    throw new Error(
      "The AI service returned an incomplete response. Please try again."
    );
  }
}

function parseJSON(raw, { requiredFields = [] } = {}) {
  if (raw && typeof raw === "object") {
    assertRequiredFields(raw, requiredFields);
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

  try {
    const parsed = JSON.parse(cleaned);
    assertRequiredFields(parsed, requiredFields);
    return parsed;
  } catch (err) {
    if (err.message.includes("incomplete response")) throw err;
  }

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
    const repaired = attemptJSONRepair(cleaned.slice(start));
    if (repaired) {
      console.warn(
        "AI response was truncated; recovered a partial",
        Array.isArray(repaired) ? `array (${repaired.length} item(s))` : "object",
        "instead of failing the request."
      );
      assertRequiredFields(repaired, requiredFields);
      return repaired;
    }

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
    const parsed = JSON.parse(jsonString);
    assertRequiredFields(parsed, requiredFields);
    return parsed;
  } catch (error) {
    if (error.message.includes("incomplete response")) throw error;

    const repaired = attemptJSONRepair(jsonString);
    if (repaired) {
      console.warn(
        "AI response had malformed JSON; recovered a partial",
        Array.isArray(repaired) ? `array (${repaired.length} item(s))` : "object",
        "instead of failing the request."
      );
      assertRequiredFields(repaired, requiredFields);
      return repaired;
    }

    console.error(
      "Invalid JSON returned by AI:",
      jsonString.slice(0, 1000)
    );

    throw new Error(
      "The AI service returned invalid data. Please try again."
    );
  }
}

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
  "bestTimeToBuy": "string, max 12 words",
  "aiRecommendation": "string, max 25 words",
  "scamWarning": "string, max 20 words",
  "trend": "Stable",
  "seasonalNote": "string, max 15 words"
}

Rules:
- All price fields must be numbers.
- confidenceScore must be between 0 and 60.
- touristPremium must be a percentage number.
- trend must be Rising, Stable, or Falling.
- Keep every string field within its stated word limit — brevity matters more than completeness here.
- No extra fields.
`;

  const raw = await callAI(
    prompt,
    PRICE_SYSTEM,
    {
      maxTokens: 2000,
      temperature: 0.1,
      json: true,
    }
  );

  return parseJSON(raw, { requiredFields: ["fairPriceMin", "fairPriceMax", "aiRecommendation"] });
};

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

  return parseJSON(raw, { requiredFields: ["verdict", "explanation"] });
};

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

  return parseJSON(raw, { requiredFields: ["translated"] });
};

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

exports.recognizeProduct = async (
  imageBase64
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "Product image recognition is currently unavailable."
    );
  }

  const res = await fetchWithRetry(
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
    },
    { timeoutMs: 20000 }
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

exports.callAIRaw = callAI;

exports.parseJSON = parseJSON;

exports.analyzeImageWithPrompt = async (
  imageBase64,
  prompt
) => {
  if (!OPENAI_KEY) {
    throw new Error(
      "Image analysis is currently unavailable."
    );
  }

  const res = await fetchWithRetry(
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
    },
    { timeoutMs: 20000 }
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

// FIX: static fallback list used by /markets-search when the AI call fails
// after retries — so a slow/unavailable AI provider never leaves the user
// with a blank error screen on what's essentially a "browse known markets"
// page. This MUST be exported below (exports.FALLBACK_MARKETS) — a missing
// export here is exactly what caused the earlier server crash.
const FALLBACK_MARKETS = [
  {
    id: "chandni-chowk", name: "Chandni Chowk", city: "Delhi", state: "Delhi",
    category: "Mixed",
    description: "One of Delhi's oldest and busiest markets, known for spices, jewellery, textiles, and street food. A must-visit for first-time tourists.",
    trustScore: 72, fairPriceScore: 65, touristFriendlyScore: 68,
    avgRating: 4.3, totalReviews: 5200, negotiationSuccessRate: 70,
    peakHours: ["11:00 AM", "6:00 PM"], languages: ["Hindi", "Punjabi", "English"],
    popularProducts: ["Spices", "Sarees", "Jewellery", "Street food"],
    openNow: true, openingHours: "10:00 AM – 8:00 PM", isVerified: true, color: "#f59e0b",
  },
  {
    id: "johari-bazaar", name: "Johari Bazaar", city: "Jaipur", state: "Rajasthan",
    category: "Jewellery",
    description: "Jaipur's famous jewellery market specialising in gemstones, gold, and traditional Rajasthani jewellery.",
    trustScore: 75, fairPriceScore: 60, touristFriendlyScore: 65,
    avgRating: 4.4, totalReviews: 3100, negotiationSuccessRate: 62,
    peakHours: ["10:30 AM", "7:00 PM"], languages: ["Hindi", "Rajasthani", "English"],
    popularProducts: ["Gemstones", "Gold jewellery", "Kundan sets"],
    openNow: true, openingHours: "10:00 AM – 8:30 PM", isVerified: true, color: "#8b5cf6",
  },
  {
    id: "crawford-market", name: "Crawford Market", city: "Mumbai", state: "Maharashtra",
    category: "Mixed",
    description: "A historic Mumbai market known for fresh produce, spices, pets, and imported goods, housed in a colonial-era building.",
    trustScore: 70, fairPriceScore: 63, touristFriendlyScore: 66,
    avgRating: 4.2, totalReviews: 2800, negotiationSuccessRate: 58,
    peakHours: ["9:00 AM", "5:00 PM"], languages: ["Hindi", "Marathi", "English"],
    popularProducts: ["Fruits", "Spices", "Dry fruits", "Imported chocolates"],
    openNow: true, openingHours: "11:00 AM – 8:00 PM", isVerified: true, color: "#ec4899",
  },
  {
    id: "laad-bazaar", name: "Laad Bazaar", city: "Hyderabad", state: "Telangana",
    category: "Handicrafts",
    description: "Famous for lac bangles, pearls, and traditional Hyderabadi jewellery near the Charminar.",
    trustScore: 71, fairPriceScore: 61, touristFriendlyScore: 64,
    avgRating: 4.3, totalReviews: 2200, negotiationSuccessRate: 66,
    peakHours: ["11:00 AM", "8:00 PM"], languages: ["Hindi", "Telugu", "Urdu", "English"],
    popularProducts: ["Lac bangles", "Pearls", "Bidri ware"],
    openNow: true, openingHours: "10:30 AM – 9:00 PM", isVerified: true, color: "#dc2626",
  },
  {
    id: "commercial-street", name: "Commercial Street", city: "Bangalore", state: "Karnataka",
    category: "Textiles",
    description: "A popular shopping stretch for clothing, footwear, and accessories at negotiable prices.",
    trustScore: 74, fairPriceScore: 68, touristFriendlyScore: 72,
    avgRating: 4.1, totalReviews: 1800, negotiationSuccessRate: 60,
    peakHours: ["11:00 AM", "7:00 PM"], languages: ["Kannada", "Hindi", "English"],
    popularProducts: ["Clothing", "Footwear", "Bags"],
    openNow: true, openingHours: "10:30 AM – 9:00 PM", isVerified: true, color: "#0ea5e9",
  },
  {
    id: "sarojini-nagar", name: "Sarojini Nagar", city: "Delhi", state: "Delhi",
    category: "Textiles",
    description: "Delhi's go-to budget shopping market for clothing, export surplus, and accessories.",
    trustScore: 73, fairPriceScore: 70, touristFriendlyScore: 75,
    avgRating: 4.2, totalReviews: 4100, negotiationSuccessRate: 74,
    peakHours: ["12:00 PM", "7:00 PM"], languages: ["Hindi", "English"],
    popularProducts: ["Clothing", "Footwear", "Accessories"],
    openNow: true, openingHours: "10:00 AM – 8:30 PM", isVerified: true, color: "#16a34a",
  },
];

exports.FALLBACK_MARKETS = FALLBACK_MARKETS;

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