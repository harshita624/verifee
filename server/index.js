const express        = require("express");
const cors           = require("cors");
const helmet         = require("helmet");
const morgan         = require("morgan");
const rateLimit      = require("express-rate-limit");
require("dotenv").config();

const connectDB      = require("./config/db");
const errorHandler   = require("./middleware/errorHandler");

const authRoutes       = require("./routes/auth");
const priceRoutes      = require("./routes/prices");
const aiRoutes         = require("./routes/ai");
const shopRoutes       = require("./routes/shops");
const scamReportRoutes = require("./routes/scamReports");

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

// Security
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// Rate limiting
app.use("/api/v1/",      rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));
app.use("/api/v1/auth/", rateLimit({ windowMs: 15 * 60 * 1000, max: 20  }));
app.use("/api/v1/ai/",   rateLimit({ windowMs: 60 * 1000,      max: 30  }));

// Body parsing
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    provider:  process.env.AI_PROVIDER || "groq",
    env:       process.env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",         authRoutes);
app.use("/api/v1/prices",       priceRoutes);
app.use("/api/v1/ai",           aiRoutes);
app.use("/api/v1/shops",        shopRoutes);
app.use("/api/v1/scam-reports", scamReportRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Verifee server on port ${PORT} | AI: ${process.env.AI_PROVIDER || "groq"}`);
});

module.exports = app;