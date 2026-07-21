const express     = require("express");
const ScamReport  = require("../models/ScamReport");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/v1/scam-reports
router.get("/", async (req, res, next) => {
  try {
    const { city, category, limit = 30, page = 1 } = req.query;
    const filter = {};
    if (city)     filter.city     = new RegExp(city, "i");
    if (category) filter.category = category;

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
router.post("/", async (req, res, next) => {
  try {
    const { product, city, marketName, chargedPrice, fairPrice, description, category } = req.body;

    if (!product || !city || !chargedPrice) {
      return res.status(400).json({ success: false, message: "Product, city, and charged price are required" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    let reportedBy = "Anonymous";
    if (token) {
      try {
        const jwt  = require("jsonwebtoken");
        const User = require("../models/User");
        const dec  = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(dec.id).select("name");
        if (user) reportedBy = user.name;
      } catch {}
    }

    const report = await ScamReport.create({
      product: product.trim(),
      city:    city.trim(),
      marketName, chargedPrice: Number(chargedPrice),
      fairPrice:  Number(fairPrice) || undefined,
      description, category, reportedBy,
      submittedBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// PATCH /api/v1/scam-reports/:id/upvote
router.patch("/:id/upvote", async (req, res, next) => {
  try {
    const report = await ScamReport.findByIdAndUpdate(
      req.params.id,
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.json({ success: true, data: { upvotes: report.upvotes } });
  } catch (err) { next(err); }
});

module.exports = router;