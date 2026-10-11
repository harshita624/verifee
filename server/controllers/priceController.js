const PriceReport = require("../models/PriceReport");
const aiService = require("../services/aiService");
const { escapeRegex } = require("../utils/regex");
const { awardXp } = require("../utils/xp");

const DAILY_REPORT_LIMIT = 25;

const ci = (s) => new RegExp(escapeRegex(s), "i");

exports.getReports = async (req, res, next) => {
  try {
    const { product, city, category } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const filter = {};
    if (product) filter.product = ci(product);
    if (city) filter.city = ci(city);
    if (category) filter.category = category;

    const [reports, total, stats] = await Promise.all([
      PriceReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("submittedBy", "name avatar xp level")
        .lean(),
      PriceReport.countDocuments(filter),
      PriceReport.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avg: { $avg: "$pricePaid" },
            min: { $min: "$pricePaid" },
            max: { $max: "$pricePaid" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: reports,
      stats: stats[0] || null,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * FIX: reports were saved with isVerified=false and every ML/RAG query filters
 * on isVerified=true, so "community_verified" data could never exist and the
 * whole statistical pipeline silently fell back to AI estimates.
 *
 * A report is now auto-verified when its price is plausible: compared with the
 * median of existing reports for the same product+city when there are 3+, or
 * against the AI fair-price range otherwise. Implausible prices stay unverified.
 */
async function isPlausible(product, city, category, price) {
  const existing = await PriceReport.find({ product: ci(product), city: ci(city) })
    .select("pricePaid")
    .limit(200)
    .lean();

  if (existing.length >= 3) {
    const sorted = existing.map((r) => r.pricePaid).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return median > 0 && price >= median * 0.3 && price <= median * 3;
  }

  try {
    const est = await aiService.getFairPrice(product, city, category);
    const lo = Number(est.fairPriceMin);
    const hi = Number(est.fairPriceMax);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= 0) return false;
    return price >= lo * 0.35 && price <= hi * 2.5;
  } catch {
    return false;
  }
}

exports.createReport = async (req, res, next) => {
  try {
    const {
      product, pricePaid, shopName, city, state,
      marketName, gpsLat, gpsLng, quality, notes,
    } = req.body;
    const category = String(req.body.category || "").trim() || "other";

    if (!product?.trim() || !pricePaid || !city?.trim())
      return res.status(400).json({ success: false, message: "Product, price, and city are required" });

    const price = Number(pricePaid);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000)
      return res.status(400).json({ success: false, message: "Enter a valid price greater than 0" });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await PriceReport.countDocuments({ submittedBy: req.user._id, createdAt: { $gte: since } });
    if (recent >= DAILY_REPORT_LIMIT)
      return res.status(429).json({ success: false, message: "Daily contribution limit reached. Come back tomorrow." });

    const verified = await isPlausible(product.trim(), city.trim(), category, price);

    const report = await PriceReport.create({
      product: product.trim(),
      category,
      pricePaid: price,
      shopName: shopName?.trim(),
      city: city.trim(),
      state: state?.trim(),
      marketName: marketName?.trim(),
      gpsLat: gpsLat ? Number(gpsLat) : undefined,
      gpsLng: gpsLng ? Number(gpsLng) : undefined,
      quality: ["poor", "fair", "good", "excellent"].includes(quality) ? quality : "good",
      notes: notes ? String(notes).trim().slice(0, 300) : undefined,
      submittedBy: req.user._id,
      isVerified: verified,
      aiConfidence: verified ? 70 : 0,
    });

    const xpAwarded = verified ? 80 : 50; // 50 for submitting + 30 when it verifies
    await awardXp(req.user._id, xpAwarded, { contributionCount: 1 });

    res.status(201).json({
      success: true,
      data: report,
      message: verified
        ? `Price report verified! You earned ${xpAwarded} XP.`
        : "Price report submitted for review. You earned 50 XP.",
      xpAwarded,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductStats = async (req, res, next) => {
  try {
    const product = decodeURIComponent(req.params.product);
    const { city } = req.query;

    const match = { product: ci(product), isVerified: true };
    if (city) match.city = ci(city);

    const [stats, recentReports] = await Promise.all([
      PriceReport.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            avg: { $avg: "$pricePaid" },
            min: { $min: "$pricePaid" },
            max: { $max: "$pricePaid" },
            count: { $sum: 1 },
          },
        },
      ]),
      PriceReport.find(match)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("submittedBy", "name avatar")
        .lean(),
    ]);

    res.json({ success: true, data: { stats: stats[0] || null, recentReports } });
  } catch (err) {
    next(err);
  }
};

// FIX: a user could previously vote on the same report unlimited times.
exports.voteHelpful = async (req, res, next) => {
  try {
    const report = await PriceReport.findOneAndUpdate(
      { _id: req.params.id, votedBy: { $ne: req.user._id } },
      { $inc: { helpfulVotes: 1 }, $addToSet: { votedBy: req.user._id } },
      { new: true }
    );
    if (!report) {
      const exists = await PriceReport.exists({ _id: req.params.id });
      return res
        .status(exists ? 409 : 404)
        .json({ success: false, message: exists ? "You already voted on this report" : "Report not found" });
    }
    res.json({ success: true, data: { helpfulVotes: report.helpfulVotes } });
  } catch (err) {
    next(err);
  }
};