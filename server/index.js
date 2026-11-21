const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const sanitizeInput = require("./middleware/sanitize");
const { optionalAuth } = require("./middleware/auth");
const { planGate } = require("./middleware/planGate");
const MongoRateLimitStore = require("./services/mongoRateLimitStore");

const authRoutes = require("./routes/auth");
const priceRoutes = require("./routes/prices");
const aiRoutes = require("./routes/ai");
const shopRoutes = require("./routes/shops");
const scamReportRoutes = require("./routes/scamReports");
const paymentRoutes = require("./routes/payments");
const contactRoutes = require("./routes/contact");
const travelRoutes = require("./routes/travel");
const merchantRoutes = require("./routes/merchants");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Crash safety ─────────────────────────────────────────────────────────────
// Unhandled rejections are logged so one bad request can't take the API down.
// An uncaught *exception* leaves the process in an unknown state, so we log it
// and exit; Render restarts the service automatically.
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

// Render sits behind one reverse proxy hop.
app.set("trust proxy", 1);

// ── CORS ─────────────────────────────────────────────────────────────────────
// FRONTEND_URL may hold several comma-separated origins.
const allowedOrigins = [
  "https://verifee-ixi8-zeta.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log("Blocked CORS origin:", origin);
    const error = new Error("Not allowed by CORS");
    error.statusCode = 403;
    error.code = "CORS_ORIGIN_DENIED";
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id", "X-Auth-Transport"],
  exposedHeaders: ["X-Plan", "X-Free-Remaining"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(helmet());

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = (windowMs, max, prefix) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, store: new MongoRateLimitStore(prefix) });

app.use("/api/v1/", limiter(15 * 60 * 1000, 150, "api"));
app.use("/api/v1/auth/", limiter(15 * 60 * 1000, 20, "auth"));
app.use("/api/v1/ai/", limiter(60 * 1000, 30, "ai"));
app.use("/api/v1/payments/", limiter(15 * 60 * 1000, 60, "payments"));
app.use("/api/v1/payments/guard", limiter(60 * 1000, 15, "payment-guard"));
app.use("/api/v1/travel/", limiter(60 * 1000, 30, "travel"));
// Contact form: 5 messages per hour per IP
app.use("/api/v1/contact", limiter(60 * 60 * 1000, 5, "contact"));

// ── Body parsing ─────────────────────────────────────────────────────────────
// Only the AI routes need a large body (receipt images as base64). Everything
// else is capped at 1 MB. The first parser to run wins, so order matters.
app.use("/api/v1/ai", express.json({ limit: "15mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Neutralise regex metacharacters in fields that feed $regex queries.
app.use(sanitizeInput);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ── Health ───────────────────────────────────────────────────────────────────
// Health endpoints are public deployment probes. Return only probe status and
// timing; provider and payment configuration stays private.
const healthPayload = (status) => ({
  status,
  timestamp: new Date().toISOString(),
});

app.get("/health/live", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/health/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json(healthPayload(ready ? "ready" : "not_ready"));
});
// Keep the existing monitor URL, but make it report readiness accurately.
app.get("/health", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json(healthPayload(ready ? "ok" : "not_ready"));
});

// ── Premium AI actions: free users get a daily quota, Pro is unlimited ──────
app.use(
  [
    "/api/v1/ai/bargain-script",
    "/api/v1/ai/bargain-reply",
    "/api/v1/ai/verify-receipt",
  ],
  optionalAuth,
  planGate("premium")
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/prices", priceRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/shops", shopRoutes);
app.use("/api/v1/scam-reports", scamReportRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/travel", travelRoutes);
app.use("/api/v1/merchants", merchantRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

async function startServer() {
  if (process.env.NODE_ENV === "production" &&
      (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32 ||
       process.env.JWT_SECRET === "replace-with-a-long-random-secret")) {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 bytes in production.");
  }
  await connectDB();
  return app.listen(PORT, () => {
    console.log(
      `Verifee server running on port ${PORT} | AI: ${process.env.AI_PROVIDER || "groq"} | ` +
        `PayPal: ${process.env.PAYPAL_ENV === "live" ? "live" : "sandbox"}`
    );
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("API startup failed:", err.message);
    process.exit(1);
  });
}

module.exports = app;
module.exports.startServer = startServer;
