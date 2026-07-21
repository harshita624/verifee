const PriceReport = require("../models/PriceReport");
const aiService = require("../services/aiService");

exports.getReports = async (req, res, next) => {
  try {
    const { product, city, category, limit = 20, page = 1 } = req.query;

    const filter = {};
    if (product) filter.product = new RegExp(product, "i");
    if (city) filter.city = new RegExp(city, "i");
    if (category) filter.category = category;

    const [reports, total] = await Promise.all([
      PriceReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .populate("submittedBy", "name avatar xp level")
        .lean(),
      PriceReport.countDocuments(filter),
    ]);

    // Aggregate stats
    const stats = await PriceReport.aggregate([
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
    ]);

    res.json({
      success: true,
      data: reports,
      stats: stats[0] || null,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

exports.createReport = async (req, res, next) => {
  try {
    const {
      product, category, pricePaid, shopName,
      city, state, marketName, gpsLat, gpsLng,
    } = req.body;

    if (!product || !category || !pricePaid || !city)
      return res.status(400).json({ success: false, message: "Product, category, price, and city are required" });

    if (Number(pricePaid) <= 0)
      return res.status(400).json({ success: false, message: "Price must be greater than 0" });

    const report = await PriceReport.create({
      product: product.trim(),
      category,
      pricePaid: Number(pricePaid),
      shopName: shopName?.trim(),
      city: city.trim(),
      state: state?.trim(),
      marketName: marketName?.trim(),
      gpsLat: gpsLat ? Number(gpsLat) : undefined,
      gpsLng: gpsLng ? Number(gpsLng) : undefined,
      submittedBy: req.user._id,
    });

    // Award XP for contribution
    await req.user.updateOne({
      $inc: { xp: 50, contributionCount: 1 },
    });

    res.status(201).json({
      success: true,
      data: report,
      message: "Price report submitted! You earned 50 XP.",
      xpAwarded: 50,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductStats = async (req, res, next) => {
  try {
    const product = decodeURIComponent(req.params.product);
    const { city } = req.query;

    const match = {
      product: new RegExp(product, "i"),
      isVerified: true,
    };
    if (city) match.city = new RegExp(city, "i");

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

    res.json({
      success: true,
      data: {
        stats: stats[0] || null,
        recentReports,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.voteHelpful = async (req, res, next) => {
  try {
    const report = await PriceReport.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulVotes: 1 } },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.json({ success: true, data: { helpfulVotes: report.helpfulVotes } });
  } catch (err) {
    next(err);
  }
};