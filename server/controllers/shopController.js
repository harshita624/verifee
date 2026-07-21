const Shop = require("../models/Shop");
const aiService = require("../services/aiService");

exports.getShops = async (req, res, next) => {
  try {
    const { city, category, search, limit = 20, page = 1, lat, lng, radius = 10 } = req.query;

    const filter = {};
    if (city) filter.city = new RegExp(city, "i");
    if (category) filter.category = category;
    if (search) filter.$or = [
      { name: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
      { popularProducts: { $elemMatch: { $regex: search, $options: "i" } } },
    ];

    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .sort({ trustScore: -1, avgRating: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Shop.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shops,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id).lean();
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
};

exports.createShop = async (req, res, next) => {
  try {
    const shop = await Shop.create({
      ...req.body,
      addedBy: req.user._id,
      isVerified: false,
    });

    // XP for suggesting a shop
    await req.user.updateOne({ $inc: { xp: 30 } });

    res.status(201).json({
      success: true,
      data: shop,
      message: "Shop submitted for verification. You earned 30 XP!",
    });
  } catch (err) {
    next(err);
  }
};

exports.getTrustedShops = async (req, res, next) => {
  try {
    const { city, limit = 10 } = req.query;
    const filter = { isVerified: true, trustScore: { $gte: 70 } };
    if (city) filter.city = new RegExp(city, "i");

    const shops = await Shop.find(filter)
      .sort({ trustScore: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: shops });
  } catch (err) {
    next(err);
  }
};