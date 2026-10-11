const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const sanitizeInput = require("./middleware/sanitize");
const { optionalAuth } = require("./middleware/auth");
const { planGate } = require("./middleware/planGate");

const authRoutes = require("./routes/auth");
const priceRoutes = require("./routes/prices");
const aiRoutes = require("./routes/ai");
const shopRoutes = require("./routes/shops");
const scamReportRoutes = require("./routes/scamReports");
const paymentRoutes = require("./routes/payments");

const app = express();

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
    process.exit(1);
});

app.set("trust proxy", 1);

connectDB();

const allowedOrigins = [
    "https://verifee-ixi8-zeta.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    ...(process.env.FRONTEND_URL || "")
        .split(",")
        .map((s) => s.trim().replace(/\/$/, ""))
        .filter(Boolean),
];

const corsOptions = {
    origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error("Blocked CORS origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Session-Id",
    ],

    exposedHeaders: [
        "X-Plan",
        "X-Free-Remaining",
    ],
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

app.use(helmet());

const limiter = (windowMs, max) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
    });

app.use("/api/v1/", limiter(15 * 60 * 1000, 150));
app.use("/api/v1/auth/", limiter(15 * 60 * 1000, 20));
app.use("/api/v1/ai/", limiter(60 * 1000, 30));
app.use("/api/v1/payments/", limiter(15 * 60 * 1000, 60));
app.use("/api/v1/payments/guard", limiter(60 * 1000, 15));

app.use("/api/v1/ai", express.json({ limit: "15mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(sanitizeInput);

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        provider: process.env.AI_PROVIDER || "groq",
        paypal: Boolean(
            process.env.PAYPAL_CLIENT_ID &&
            process.env.PAYPAL_CLIENT_SECRET
        ),
        paypalEnv:
            process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
        upi: Boolean(process.env.UPI_MERCHANT_VPA),
        env: process.env.NODE_ENV || "development",
    });
});

app.use(
    [
        "/api/v1/ai/bargain-script",
        "/api/v1/ai/bargain-reply",
        "/api/v1/ai/verify-receipt",
    ],
    optionalAuth,
    planGate("premium")
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/prices", priceRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/shops", shopRoutes);
app.use("/api/v1/scam-reports", scamReportRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(
        `Verifee server running on port ${PORT} | AI: ${
            process.env.AI_PROVIDER || "groq"
        } | PayPal: ${
            process.env.PAYPAL_ENV === "live" ? "live" : "sandbox"
        }`
    );
});

module.exports = app;