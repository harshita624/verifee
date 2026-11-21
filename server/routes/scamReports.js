const express     = require("express");
const ScamReport  = require("../models/ScamReport");
const { protect, optionalAuth } = require("../middleware/auth");
const { normalizeCategory, categoryFilter } = require("../utils/category");
const { escapeRegex } = require("../utils/regex");

const router = express.Router();

// GET /api/v1/scam-reports
router.get("/", async (req, res, next) => {
  try {
    const { city, category } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const requestedPage = Number.parseInt(req.query.page, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
    const filter = {};
    if (city) filter.city = new RegExp(escapeRegex(String(city).slice(0, 100)), "i");
    if (category) Object.assign(filter, categoryFilter(category));

    const [reports, total] = await Promise.all([
      ScamReport.find(filter)
        .sort({ reportedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .select("-submittedBy -votedBy")
        .lean(),
      ScamReport.countDocuments(filter),
    ]);

    res.json({ success: true, data: reports, total });
  } catch (err) { next(err); }
});

// POST /api/v1/scam-reports
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const { product, city, marketName, chargedPrice, fairPrice, description, category } = req.body;

    if (typeof product !== "string" || !product.trim() || product.trim().length > 120 ||
        typeof city !== "string" || !city.trim() || city.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Product, city, and charged price are required" });
    }
    const charged = Number(chargedPrice);
    const fair = fairPrice === undefined || fairPrice === null || fairPrice === "" ? undefined : Number(fairPrice);
    if (!Number.isFinite(charged) || charged <= 0 || charged > 10_000_000 ||
        (fair !== undefined && (!Number.isFinite(fair) || fair <= 0 || fair > 10_000_000))) {
      return res.status(400).json({ success: false, message: "Enter valid charged and fair prices." });
    }
    if (marketName !== undefined && (typeof marketName !== "string" || marketName.length > 120) ||
        description !== undefined && (typeof description !== "string" || description.length > 600)) {
      return res.status(400).json({ success: false, message: "Market name or description is too long or invalid." });
    }

    const reportedBy = req.user ? "Community member" : "Anonymous";

    const report = await ScamReport.create({
      product: product.trim(),
      city:    city.trim(),
      marketName: marketName?.trim(), chargedPrice: charged,
      fairPrice: fair,
      description, category: normalizeCategory(category, product), reportedBy,
      submittedBy: req.user?._id,
    });

    const publicReport = report.toObject();
    delete publicReport.submittedBy;
    delete publicReport.votedBy;
    res.status(201).json({ success: true, data: publicReport });
  } catch (err) { next(err); }
});

// PATCH /api/v1/scam-reports/:id/upvote
router.patch("/:id/upvote", protect, async (req, res, next) => {
  try {
    const report = await ScamReport.findOneAndUpdate(
      { _id: req.params.id, votedBy: { $ne: req.user._id } },
      { $inc: { upvotes: 1 }, $addToSet: { votedBy: req.user._id } },
      { new: true }
    );
    if (!report) {
      const exists = await ScamReport.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "You have already marked this report helpful." : "Report not found" });
    }
    res.json({ success: true, data: { upvotes: report.upvotes } });
  } catch (err) { next(err); }
});

module.exports = router;
