# Verifee

**AI-Powered Price Intelligence & Protection Platform**

Verifee is a full-stack tourist price-protection platform that combines machine learning, retrieval-augmented generation (RAG), NLP, and multiple LLM providers to help users understand whether a price is reasonable and receive grounded, explainable recommendations.

**Live Demo:** https://verifee-ixi8-zeta.vercel.app

## What Verifee Does

Verifee brings together community-verified receipt data, statistical analysis, price forecasting, and AI-powered conversations into a single platform.

The system can:

- Retrieve semantically similar historical receipts
- Detect unusual or potentially inflated prices
- Forecast price trends
- Ground AI responses in verified receipt data
- Classify user queries into multiple intents
- Extract entities from natural-language queries
- Maintain session-aware conversational context
- Handle Hindi-English mixed queries
- Show whether a response is based on community-verified data or an AI estimate

## Key Features

### AI & RAG

- Retrieval-Augmented Generation using community-verified MongoDB receipt data
- Unified inference layer supporting:
  - Groq
  - OpenAI
  - Gemini
  - Ollama
- Responses include data-source confidence/provenance indicators
- Session-aware context tracking and anaphora resolution

### Machine Learning

Verifee uses an on-server ML pipeline without relying on external ML APIs for its statistical/ML processing:

- TF-IDF + Cosine Similarity — semantic receipt retrieval
- Z-score + IQR — statistical price anomaly detection
- Linear Regression — price-trend forecasting

### NLP Pipeline

The NLP layer includes:

- 7-intent classification
- Named Entity Recognition (NER)
- Query normalization
- Session-aware context
- Anaphora resolution
- Hindi-English mixed-input handling

### Security

- JWT authentication
- Google OAuth
- Tiered rate limiting
- Unified backend inference abstraction

## Architecture

```
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
```

## Tech Stack

**Frontend**
- Next.js

**Backend**
- Express.js
- Node.js

**Database**
- MongoDB

**AI / ML**
- Python
- TF-IDF
- Cosine Similarity
- Z-score
- IQR anomaly detection
- Linear Regression
- RAG
- Prompt Engineering

**LLM Providers**
- Groq / Llama
- OpenAI
- Gemini
- Ollama

**Authentication & Security**
- JWT
- Google OAuth
- Rate Limiting

## ML & AI Pipeline

**1. Query Understanding**

A user's natural-language request is normalized and classified into one of seven supported intents. Named entities are extracted before retrieval.

**2. Semantic Retrieval**

The system uses TF-IDF vectors and cosine similarity to identify relevant historical/community-verified receipts.

**3. Price Analysis**

Retrieved data is analyzed using:

- Z-score
- Interquartile Range (IQR)

This helps identify prices that deviate significantly from observed data.

**4. Price Forecasting**

Linear regression is used to estimate price trends from available historical data.

**5. RAG Response**

Relevant receipt information is passed into the RAG pipeline so the LLM can generate an answer grounded in the available community-verified data.

**6. Provenance**

The application distinguishes between:

- Community-verified information
- AI estimates

This makes the source and confidence of an answer visible to the user.

## Why Verifee?

Traditional AI assistants can generate plausible answers without showing where the information came from.

Verifee takes a different approach:

**Retrieve → Analyze → Ground → Explain**

Instead of relying solely on an LLM, Verifee combines real receipt data, statistical analysis, ML forecasting, and RAG to produce more transparent price intelligence.

## Project Highlights

- Production-deployed full-stack application
- Multiple LLM providers behind a single inference interface
- On-server ML pipeline with no external ML API dependency for statistical analysis
- RAG grounded in community-verified data
- Multilingual NLP support for Hindi-English mixed queries
- Authentication, OAuth, and rate limiting integrated into the application

## Deployment

Verifee is deployed as a production web application.

**Live:** https://verifee-ixi8-zeta.vercel.app

## Author

**Harshita Sharma**

B.Tech — Computer Science & Engineering
KIIT University

- GitHub: https://github.com/harshita624
- LinkedIn: https://www.linkedin.com/in/harshita-sharma-b782942a7/

## Note

This README describes the architecture and capabilities of the deployed Verifee project. Configuration details and environment variables should be added according to the project's actual local development setup.
