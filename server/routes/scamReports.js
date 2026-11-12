const express     = require("express");
const ScamReport  = require("../models/ScamReport");
const { protect, optionalAuth } = require("../middleware/auth");
const { normalizeCategory, categoryFilter } = require("../utils/category");

const router = express.Router();

// GET /api/v1/scam-reports
router.get("/", async (req, res, next) => {
  try {
    const { city, category, limit = 30, page = 1 } = req.query;
    const filter = {};
    if (city)     filter.city     = new RegExp(city, "i");
    if (category) Object.assign(filter, categoryFilter(category));

    const [reports, total] = await Promise.all([
      ScamReport.find(filter)
        .sort({ reportedAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
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

    if (!product || !city || !chargedPrice) {
      return res.status(400).json({ success: false, message: "Product, city, and charged price are required" });
    }

    const reportedBy = req.user?.name || "Anonymous";

    const report = await ScamReport.create({
      product: product.trim(),
      city:    city.trim(),
      marketName, chargedPrice: Number(chargedPrice),
      fairPrice:  Number(fairPrice) || undefined,
      description, category: normalizeCategory(category, product), reportedBy,
      submittedBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: report });
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