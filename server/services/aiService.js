require("dotenv").config();

const AI_PROVIDER = process.env.AI_PROVIDER || "groq";

const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// ─────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────

async function callGroq(prompt, systemPrompt, options = {}) {
  if (!GROQ_KEY) {
    throw new Error("GROQ_API_KEY not set in .env");
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

  const requestBody = {
    model: options.model || GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens || 1024,
  };

  // Force JSON only when requested
  if (options.json) {
    requestBody.response_format = {
      type: "json_object",
    };
  }

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();

  console.log(
    "GROQ RESPONSE:",
    JSON.stringify(data, null, 2)
  );

  const content = data?.choices?.[0]?.message?.content;

  console.log(
    "GROQ CONTENT:",
    JSON.stringify(content)
  );

  if (!content) {
    throw new Error(
      `Groq returned an empty response: ${JSON.stringify(data)}`
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────
// Groq chat with history
// ─────────────────────────────────────────────────────────────

async function callGroqWithHistory(
  message,
  systemPrompt,
  history = []
) {
  if (!GROQ_KEY) {
    throw new Error("GROQ_API_KEY not set in .env");
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
        max_tokens: 600,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `Groq history error ${res.status}: ${err}`
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      `Groq history returned empty response: ${JSON.stringify(
        data
      )}`
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────
// OpenAI
// ─────────────────────────────────────────────────────────────

async function callOpenAI(
  prompt,
  systemPrompt,
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

  const requestBody = {
    model: options.model || "gpt-4o-mini",
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens || 1024,
  };

  if (options.json) {
    requestBody.response_format = {
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
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    throw new Error(
      `OpenAI error ${res.status}: ${await res.text()}`
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      `OpenAI returned empty response: ${JSON.stringify(
        data
      )}`
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────
// Gemini
// ─────────────────────────────────────────────────────────────

async function callGemini(
  prompt,
  systemPrompt,
  options = {}
) {
  if (!GEMINI_KEY) {
    throw new Error(
      "GEMINI_API_KEY not set in .env"
    );
  }

  const model =
    options.model || "gemini-1.5-flash";

  const full = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

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
              text: full,
            },
          ],
        },
      ],
      generationConfig: {
        temperature:
          options.temperature ?? 0.2,
        maxOutputTokens:
          options.maxTokens || 1024,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Gemini error ${res.status}: ${await res.text()}`
    );
  }

  const data = await res.json();

  const content =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error(
      `Gemini returned empty response: ${JSON.stringify(
        data
      )}`
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────
// Ollama
// ─────────────────────────────────────────────────────────────

async function callOllama(
  prompt,
  systemPrompt,
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

  const res = await fetch(
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
          temperature:
            options.temperature ?? 0.2,
          num_predict:
            options.maxTokens || 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Ollama error ${res.status}: ${await res.text()}`
    );
  }

  const data = await res.json();

  const content = data?.message?.content;

  if (!content) {
    throw new Error(
      `Ollama returned empty response: ${JSON.stringify(
        data
      )}`
    );
  }

  return content;
}


// ─────────────────────────────────────────────────────────────
// Core dispatcher
// ─────────────────────────────────────────────────────────────

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


// ─────────────────────────────────────────────────────────────
// JSON parser
// ─────────────────────────────────────────────────────────────

function parseJSON(raw) {
  if (raw === null || raw === undefined) {
    throw new Error(
      "AI returned null or undefined response"
    );
  }

  if (typeof raw !== "string") {
    return raw;
  }

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  console.log(
    "AI RAW RESPONSE:",
    JSON.stringify(raw)
  );

  console.log(
    "AI CLEANED RESPONSE:",
    JSON.stringify(cleaned)
  );

  if (!cleaned) {
    throw new Error(
      "AI returned an empty response"
    );
  }

  // If the entire response is already valid JSON
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Continue and try extracting JSON
  }

  // Find first { or [
  const start = cleaned.search(/[\[{]/);

  if (start === -1) {
    throw new Error(
      `No JSON found in AI response: ${cleaned.slice(
        0,
        500
      )}`
    );
  }

  const end =
    Math.max(
      cleaned.lastIndexOf("}"),
      cleaned.lastIndexOf("]")
    ) + 1;

  if (end <= start) {
    throw new Error(
      `Incomplete JSON returned by AI: ${cleaned.slice(
        start,
        start + 500
      )}`
    );
  }

  const jsonString = cleaned.slice(
    start,
    end
  );

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(
      "JSON PARSE ERROR:",
      error.message
    );

    console.error(
      "JSON STRING:",
      jsonString
    );

    throw new Error(
      `Invalid JSON returned by AI: ${jsonString.slice(
        0,
        500
      )}`
    );
  }
}


// ─────────────────────────────────────────────────────────────
// System prompts
// ─────────────────────────────────────────────────────────────

const PRICE_SYSTEM = `
You are Verifee's AI price engine for Indian markets.

You know the difference between tourist prices and local prices.

Return ONLY valid JSON.
No markdown.
No explanation.
No code fences.
`;

const SCAM_SYSTEM = `
You are Verifee's scam detection AI protecting tourists in India.

Return ONLY valid JSON.
No markdown.
No explanation.
No code fences.
`;

const TRANSLATE_SYSTEM = `
You are a shopping translator for Indian markets.

Return ONLY valid JSON.
No markdown.
No code fences.
`;


// ─────────────────────────────────────────────────────────────
// Fair Price
// ─────────────────────────────────────────────────────────────

exports.getFairPrice = async (
  product,
  city,
  category
) => {
  const prompt = `
Estimate fair market price for: "${product}" in ${
    city || "India"
  }.

Category: ${category || "general"}

Return exactly this JSON:

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
`;

  const raw = await callAI(
    prompt,
    PRICE_SYSTEM,
    {
      maxTokens: 800,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────
// Scam Detection
// ─────────────────────────────────────────────────────────────

exports.detectScam = async (
  product,
  offeredPrice,
  city
) => {
  const prompt = `
Analyze if this is a tourist scam:

Product: ${product}

Offered price: ₹${offeredPrice}

Location: ${city || "India"}

Return exactly this JSON:

{
  "offeredPrice": ${offeredPrice},
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
`;

  const raw = await callAI(
    prompt,
    SCAM_SYSTEM,
    {
      maxTokens: 700,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────
// Translation
// ─────────────────────────────────────────────────────────────

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
Translate to ${language}: "${text}"

Return exactly this JSON:

{
  "original": "${text}",
  "translated": "",
  "romanized": "",
  "language": "${language}",
  "shoppingPhraseType": "other",
  "culturalTip": ""
}
`;

  const raw = await callAI(
    prompt,
    TRANSLATE_SYSTEM,
    {
      maxTokens: 400,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────

exports.chat = async (
  message,
  context = {},
  history = []
) => {
  const systemPrompt =
    context.systemPrompt ||
    `
You are Verifee's AI shopping assistant for Indian markets.

You help with fair prices, scam detection, bargaining, and market info.

Be direct.
Give specific INR amounts.
No emojis.
Under 120 words unless asked for detail.
`;

  if (history.length > 0) {
    return callGroqWithHistory(
      message,
      systemPrompt,
      history
    );
  }

  return callAI(
    message,
    systemPrompt,
    {
      temperature: 0.4,
      maxTokens: 500,
    }
  );
};


// ─────────────────────────────────────────────────────────────
// Product Recognition
// ─────────────────────────────────────────────────────────────

exports.recognizeProduct = async (
  imageBase64
) => {
  if (
    AI_PROVIDER !== "openai" ||
    !OPENAI_KEY
  ) {
    throw new Error(
      "Product image recognition requires AI_PROVIDER=openai and OPENAI_API_KEY"
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
Identify this product and estimate fair price in Indian markets.

Return ONLY JSON:

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
`,
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
        max_tokens: 600,
        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `OpenAI vision error ${res.status}: ${await res.text()}`
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  return parseJSON(content);
};


// ─────────────────────────────────────────────────────────────
// Receipt Parser
// ─────────────────────────────────────────────────────────────

exports.parseReceipt = async (
  textOrBase64
) => {
  const prompt = `
Extract information from this receipt/bill text:

"${textOrBase64.slice(0, 500)}"

Return JSON:

{
  "product": "",
  "shopName": "",
  "amount": 0,
  "date": "",
  "city": "",
  "category": "",
  "confidence": 0
}
`;

  const raw = await callAI(
    prompt,
    "You parse Indian shopping receipts. Return ONLY valid JSON.",
    {
      maxTokens: 300,
      json: true,
    }
  );

  return parseJSON(raw);
};


// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

exports.callAIRaw = callAI;

exports.parseJSON = parseJSON;


// ─────────────────────────────────────────────────────────────
// Analyze Image With Custom Prompt
// ─────────────────────────────────────────────────────────────

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
        max_tokens: 800,
        response_format: {
          type: "json_object",
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `OpenAI vision error ${res.status}: ${await res.text()}`
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  return parseJSON(content);
};


// ─────────────────────────────────────────────────────────────
// Provider Info
// ─────────────────────────────────────────────────────────────

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