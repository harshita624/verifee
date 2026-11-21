const Shop = require("../models/Shop");
const aiService = require("../services/aiService");
const { escapeRegex } = require("../utils/regex");

const boundedInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

exports.getShops = async (req, res, next) => {
  try {
    const { city, category, search } = req.query;
    const limit = boundedInt(req.query.limit, 20, 100);
    const page = boundedInt(req.query.page, 1, 10_000);

    // Public discovery must never expose unreviewed merchant-submitted contact data.
    const filter = { isVerified: true };
    if (city) filter.city = new RegExp(escapeRegex(String(city).slice(0, 100)), "i");
    if (category) filter.category = String(category).slice(0, 60);
    if (search) filter.$or = [
      { name: new RegExp(escapeRegex(String(search).slice(0, 100)), "i") },
      { description: new RegExp(escapeRegex(String(search).slice(0, 100)), "i") },
      { popularProducts: { $elemMatch: { $regex: escapeRegex(String(search).slice(0, 100)), $options: "i" } } },
    ];

    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .sort({ trustScore: -1, avgRating: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Shop.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shops,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, isVerified: true }).lean();
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
};

exports.createShop = async (req, res, next) => {
  try {
    const { name, city, state, address, marketName, gpsLat, gpsLng, category, categories, description, images, phone, website, languages, acceptsCards, popularProducts } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
        typeof city !== "string" || !city.trim() || city.trim().length > 100) {
      return res.status(400).json({ success: false, message: "A shop name and city are required." });
    }
    const lat = gpsLat === undefined || gpsLat === "" ? undefined : Number(gpsLat);
    const lng = gpsLng === undefined || gpsLng === "" ? undefined : Number(gpsLng);
    if ((lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
        (lng !== undefined && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return res.status(400).json({ success: false, message: "Shop coordinates are invalid." });
    }

    const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : undefined;
    const strings = (value, maxItems, maxLength) => Array.isArray(value)
      ? value.filter((item) => typeof item === "string").slice(0, maxItems).map((item) => item.trim().slice(0, maxLength))
      : undefined;
    const shop = await Shop.create({
      name: name.trim(),
      city: city.trim(),
      state: text(state, 100),
      address: text(address, 240),
      marketName: text(marketName, 120),
      gpsLat: lat,
      gpsLng: lng,
      category: text(category, 60),
      categories: strings(categories, 12, 60),
      description: text(description, 600),
      images: strings(images, 8, 500),
      phone: text(phone, 30),
      website: text(website, 250),
      languages: strings(languages, 20, 40),
      acceptsCards: acceptsCards === true,
      popularProducts: strings(popularProducts, 30, 100),
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
    const { city } = req.query;
    const limit = boundedInt(req.query.limit, 10, 50);
    const filter = { isVerified: true, trustScore: { $gte: 70 } };
    if (city) filter.city = new RegExp(escapeRegex(String(city).slice(0, 100)), "i");

    const shops = await Shop.find(filter)
      .sort({ trustScore: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: shops });
  } catch (err) {
    next(err);
  }
};
