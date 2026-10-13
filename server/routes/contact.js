const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const { protect, restrictTo } = require("../middleware/auth");
const { sendContactNotification } = require("../services/emailService");

const router = express.Router();

const TOPICS = ["General", "Support", "Payments", "Report a problem", "Press", "Partnerships"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/v1/contact  (public; rate-limited in server.js)
router.post("/", async (req, res, next) => {
  try {
    // Honeypot: bots fill the hidden "website" field. Pretend it worked.
    if (req.body.website) {
      return res.status(201).json({ success: true, message: "Thanks! We will reply by email soon." });
    }

    const name = String(req.body.name || "").trim().slice(0, 80);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 120);
    const topic = TOPICS.includes(req.body.topic) ? req.body.topic : "General";
    const message = String(req.body.message || "").trim().slice(0, 3000);

    if (!name) return res.status(400).json({ success: false, message: "Please enter your name." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    if (message.length < 10) return res.status(400).json({ success: false, message: "Please write a little more (at least 10 characters)." });

    const doc = await ContactMessage.create({
      name, email, topic, message,
      ip: req.ip,
      userAgent: (req.get("user-agent") || "").slice(0, 200),
    });

    // Email notification is best-effort; the message is already saved.
    sendContactNotification(doc).catch((err) =>
      console.error("contact notification failed:", err.message)
    );

    res.status(201).json({ success: true, message: "Thanks! We will reply by email soon." });
  } catch (err) {
    next(err);
  }
});

// Admin: read and resolve messages
router.get("/", protect, restrictTo("admin"), async (req, res, next) => {
  try {
    const filter = req.query.resolved === "true" ? {} : { resolved: false };
    const items = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/resolve", protect, restrictTo("admin"), async (req, res, next) => {
  try {
    const doc = await ContactMessage.findByIdAndUpdate(req.params.id, { resolved: true }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: "Message not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;