const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const priceRoutes = require("./routes/prices");
const aiRoutes = require("./routes/ai");
const shopRoutes = require("./routes/shops");
const scamReportRoutes = require("./routes/scamReports");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────
// Trust proxy
// ─────────────────────────────────────────────────────────────
// FIX: Render sits in front of your app as a reverse proxy and adds an
// X-Forwarded-For header. Express doesn't trust that header by default,
// so express-rate-limit refused to use it for identifying clients — this
// is exactly the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error you saw.
// `1` means "trust exactly one hop" (Render's proxy) — not `true`, which
// would trust the entire forwarded chain and let a malicious client spoof
// their own X-Forwarded-For to dodge rate limiting.
app.set("trust proxy", 1);

connectDB();

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────

const allowedOrigins = [
  "https://verifee-ixi8-zeta.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // (Postman, curl, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────

app.use(helmet());

// ─────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────

app.use(
  "/api/v1/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
  })
);

app.use(
  "/api/v1/auth/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
  })
);

app.use(
  "/api/v1/ai/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
  })
);

// ─────────────────────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    provider: process.env.AI_PROVIDER || "groq",
    env: process.env.NODE_ENV || "development",
  });
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/prices", priceRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/shops", shopRoutes);
app.use("/api/v1/scam-reports", scamReportRoutes);

// ─────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(
    `Verifee server running on port ${PORT} | AI: ${
      process.env.AI_PROVIDER || "groq"
    }`
  );
});

module.exports = app;