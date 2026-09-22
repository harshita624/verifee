# Verifee

**AI-Powered Price Intelligence & Protection Platform**

Verifee is a full-stack tourist price-protection platform that combines machine learning, retrieval-augmented generation (RAG), NLP, and multiple LLM providers to help users understand whether a price is reasonable — and get grounded, explainable, source-attributed answers instead of a plausible-sounding guess.

**Live:** https://verifee-ixi8-zeta.vercel.app

---

## At a Glance

| | |
|---|---|
| Retrieval | TF-IDF + cosine similarity over community-verified receipts |
| Anomaly detection | Z-score + IQR |
| Forecasting | Linear regression on historical price data |
| NLP | 7-intent classification, NER, anaphora resolution, Hindi-English mixed input |
| LLM providers | Groq, OpenAI, Gemini, Ollama — behind one inference interface |
| Auth | JWT + Google OAuth, tiered rate limiting |

---

## What Verifee Does

Verifee brings together community-verified receipt data, statistical analysis, price forecasting, and AI-powered conversation into a single platform.

The system can:

- Retrieve semantically similar historical receipts
- Detect unusual or potentially inflated prices
- Forecast price trends
- Ground AI responses in verified receipt data
- Classify user queries into one of seven intents
- Extract entities from natural-language queries
- Maintain session-aware conversational context, including anaphora resolution
- Handle Hindi-English mixed queries
- Show whether a response is based on community-verified data or an AI estimate

## Why Verifee?

Traditional AI assistants can generate plausible answers without showing where the information came from. Verifee takes a different approach:

**Retrieve → Analyze → Ground → Explain**

Instead of relying solely on an LLM, Verifee combines real receipt data, statistical analysis, ML forecasting, and RAG to produce transparent, source-attributed price intelligence.

## Key Features

### AI & RAG
- Retrieval-Augmented Generation using community-verified MongoDB receipt data
- Unified inference layer supporting Groq, OpenAI, Gemini, and Ollama interchangeably
- Responses include data-source confidence/provenance indicators
- Session-aware context tracking and anaphora resolution

### Machine Learning
On-server ML pipeline with no external ML API dependency for statistical processing:
- **TF-IDF + Cosine Similarity** — semantic receipt retrieval
- **Z-score + IQR** — statistical price anomaly detection
- **Linear Regression** — price-trend forecasting

### NLP Pipeline
- 7-intent classification
- Named Entity Recognition (NER)
- Query normalization
- Session-aware context + anaphora resolution
- Hindi-English mixed-input handling

### Security
- JWT authentication
- Google OAuth
- Tiered rate limiting
- Unified backend inference abstraction

## Architecture
                ┌──────────────────────┐
                │       Frontend       │
                │      Next.js         │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │      Express API     │
                │ Authentication/RL    │
                └──────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
    │ MongoDB     │ │ ML Pipeline │ │ NLP Pipeline │
    │ Receipts    │ │ TF-IDF      │ │ Intent       │
    │             │ │ Z/IQR       │ │ NER          │
    │             │ │ Regression  │ │ Context      │
    └──────┬──────┘ └─────────────┘ └──────────────┘
           │
           ▼
    ┌─────────────────────┐
    │       RAG Layer     │
    │ Verified Receipts   │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Inference Abstraction│
    └──────────┬──────────┘
               │
    ┌──────────┼───────────┬──────────┐
    ▼          ▼           ▼          ▼
  Groq       OpenAI      Gemini     Ollama
  
## ML & AI Pipeline

1. **Query Understanding** — normalize the request, classify into one of 7 intents, extract named entities.
2. **Semantic Retrieval** — TF-IDF vectors + cosine similarity find relevant community-verified receipts.
3. **Price Analysis** — Z-score and IQR flag prices that deviate significantly from observed data.
4. **Price Forecasting** — linear regression estimates price trends from historical data.
5. **RAG Response** — retrieved receipt data is passed into the RAG pipeline so the LLM's answer is grounded in real evidence.
6. **Provenance** — every answer is tagged as either community-verified or an AI estimate, so the user always knows which.

## Tech Stack

**Frontend:** Next.js
**Backend:** Express.js, Node.js
**Database:** MongoDB
**AI / ML:** Python, TF-IDF, Cosine Similarity, Z-score, IQR anomaly detection, Linear Regression, RAG, Prompt Engineering
**LLM Providers:** Groq / Llama, OpenAI, Gemini, Ollama
**Auth & Security:** JWT, Google OAuth, Rate Limiting

## Getting Started

> These are standard steps for this stack — adjust variable names to whatever your actual `.env` files use.

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- At least one LLM provider API key (Groq, OpenAI, or Gemini) — or a local Ollama install

### 1. Clone and install
```bash
git clone https://github.com/harshita624/verifee.git
cd verifee

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# ML pipeline
cd ../ml && pip install -r requirements.txt --break-system-packages
```

### 2. Environment variables

Backend `.env`:
```env
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER/verifee
JWT_SECRET=long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GROQ_API_KEY=optional
OPENAI_API_KEY=optional
GEMINI_API_KEY=optional
OLLAMA_BASE_URL=http://localhost:11434
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=/api
```

### 3. Run locally
```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

Open http://localhost:3000.

## Project Highlights

- Production-deployed full-stack application
- Four interchangeable LLM providers behind a single inference interface
- On-server ML pipeline — no external ML API dependency for statistical analysis
- RAG grounded in community-verified data, with explicit provenance tracking
- Multilingual NLP support for Hindi-English mixed queries
- Authentication, OAuth, and rate limiting integrated end-to-end

## Author

**Harshita Sharma**
B.Tech — Computer Science & Engineering, KIIT University

- GitHub: https://github.com/harshita624
- LinkedIn: https://www.linkedin.com/in/harshita-sharma-b782942a7/
