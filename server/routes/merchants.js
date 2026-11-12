const express = require("express");
const { protect, restrictTo } = require("../middleware/auth");
const MerchantProfile = require("../models/MerchantProfile");
const Payment = require("../models/Payment");
const Shop = require("../models/Shop");
const ScamReport = require("../models/ScamReport");
const paypal = require("../services/paypalService");

const router = express.Router();
const clean = (v, n = 120) => String(v || "").trim().slice(0, n);
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const distanceKmBetween = (lat1, lng1, lat2, lng2) => {
  const rad = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.get("/profiles", async (req, res, next) => {
  try {
    const city = clean(req.query.city, 80);
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    const radiusKm = Math.min(25, Math.max(0.25, Number(req.query.radiusKm) || 5));
    const filter = { isVerified: true };
    if (city) filter.city = new RegExp(escapeRegex(city), "i");
    const category = clean(req.query.category, 40).toLowerCase();
    const categoryPatterns = {
      food: /food|restaurant|cafe|eatery|snack/i,
      hotels: /hotel|hostel|stay|accommodation|lodging/i,
      services: /service|pharmacy|clinic|hospital|bank|travel|repair/i,
      shops: /shop|market|retail|textile|clothing|handicraft|jewel|electronics|souvenir|fruit|vegetable/i,
    };
    if (categoryPatterns[category]) filter.$or = [{ category: categoryPatterns[category] }, { categories: categoryPatterns[category] }];
    if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180) {
      const latDelta = radiusKm / 110.574;
      const lngDelta = radiusKm / Math.max(1, 111.32 * Math.cos(lat * Math.PI / 180));
      filter.gpsLat = { $gte: lat - latDelta, $lte: lat + latDelta };
      filter.gpsLng = { $gte: lng - lngDelta, $lte: lng + lngDelta };
    } else if (!city) return res.status(400).json({ success: false, message: "Provide a city or valid map coordinates." });
    const shops = await Shop.find(filter).select("name city state address marketName gpsLat gpsLng category categories description images fairPriceScore touristFriendlyScore trustScore totalReviews avgRating acceptsCards languages popularProducts isVerified").sort({ trustScore: -1, avgRating: -1 }).limit(50).lean();
    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const data = await Promise.all(shops.map(async (shop) => {
      const name = shop.marketName || shop.name;
      const safeName = escapeRegex(name);
      const complaints = await ScamReport.countDocuments({ city: new RegExp(escapeRegex(shop.city), "i"), marketName: new RegExp(safeName, "i"), reportedAt: { $gte: since } });
      const distanceKm = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(shop.gpsLat) && Number.isFinite(shop.gpsLng)
        ? Number(distanceKmBetween(lat, lng, shop.gpsLat, shop.gpsLng).toFixed(2)) : null;
      return { ...shop, distanceKm, complaintsLastYear: complaints, source: "Verifee reviewed profile" };
    }));
    res.set("Cache-Control", "public, max-age=120");
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/directory", async (req, res, next) => {
  try {
    if (!process.env.PAYPAL_PARTNER_ID) return res.json({ success: true, data: [] });
    const filter = { claimStatus: "verified", paypalStatus: "connected", paypalReceivable: true, paypalEmailConfirmed: true, paypalMerchantId: { $exists: true, $ne: "" } };
    if (req.query.city) filter.city = new RegExp(clean(req.query.city, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const rows = await MerchantProfile.find(filter).select("name city category description paypalMerchantId").sort({ name: 1 }).limit(50).lean();
    res.json({ success: true, data: rows.map(({ paypalMerchantId, ...x }) => x) });
  } catch (err) { next(err); }
});

router.get("/me", protect, async (req, res, next) => {
  try {
    const profile = await MerchantProfile.findOne({ owner: req.user._id }).populate("shop", "name city isVerified trustScore").lean();
    if (!profile) return res.json({ success: true, data: { profile: null, transactions: [], totals: { count: 0, gross: 0, refunds: 0 } } });
    const payments = await Payment.find({ "metadata.merchantProfileId": String(profile._id), provider: "paypal" }).sort({ createdAt: -1 }).limit(200).select("status amount amountInr currency paypalCaptureId capturedAt createdAt metadata refund").lean();
    const captured = payments.filter((p) => ["captured", "refunded"].includes(p.status));
    const totals = captured.reduce((t, p) => { t.gross += p.amountInr || p.amount; if (p.status === "refunded") t.refunds += p.refund?.amount && p.refund?.currency === "INR" ? p.refund.amount : (p.amountInr || p.amount); return t; }, { count: captured.length, gross: 0, refunds: 0 });
    res.set("Cache-Control", "private, no-store");
    res.json({ success: true, data: { profile, transactions: payments, totals } });
  } catch (err) { next(err); }
});

router.post("/me", protect, async (req, res, next) => {
  try {
    const name = clean(req.body.name), city = clean(req.body.city, 100), category = clean(req.body.category, 50);
    if (!name || !city) return res.status(400).json({ success: false, message: "Shop name and city are required." });
    let shop = null;
    if (req.body.shopId) {
      shop = await Shop.findById(req.body.shopId);
      if (!shop) return res.status(404).json({ success: false, message: "Shop profile not found." });
      if (shop.addedBy && String(shop.addedBy) !== String(req.user._id)) return res.status(409).json({ success: false, message: "This shop profile is already claimed." });
    } else {
      shop = await Shop.create({ name, city, category, description: clean(req.body.description, 500), phone: clean(req.body.phone, 30), website: clean(req.body.website, 200), addedBy: req.user._id, isVerified: false });
    }
    shop.addedBy = req.user._id; await shop.save();
    const profile = await MerchantProfile.findOneAndUpdate({ owner: req.user._id }, { $set: { shop: shop._id, name, city, category, description: clean(req.body.description, 500), phone: clean(req.body.phone, 30), website: clean(req.body.website, 200), claimStatus: "pending" } }, { new: true, upsert: true, runValidators: true });
    res.status(201).json({ success: true, data: profile, message: "Merchant profile submitted. Public trust verification requires admin review." });
  } catch (err) { next(err); }
});

router.post("/paypal/onboard", protect, async (req, res, next) => {
  try {
    const profile = await MerchantProfile.findOne({ owner: req.user._id });
    if (!profile) return res.status(409).json({ success: false, message: "Create a merchant profile first." });
    if (!process.env.PAYPAL_PARTNER_ID) return res.status(503).json({ success: false, message: "Marketplace onboarding requires PayPal partner approval and PAYPAL_PARTNER_ID." });
    const frontend = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].replace(/\/$/, "");
    const referral = await paypal.createPartnerReferral({ trackingId: String(profile._id), returnUrl: `${frontend}/merchant/onboarding/return`, email: req.user.email, name: req.user.name });
    if (!referral.actionUrl) return res.status(502).json({ success: false, message: "PayPal did not return a seller onboarding link." });
    profile.paypalTrackingId = String(profile._id); profile.paypalReferralId = referral.referralId; profile.paypalReferralUrl = referral.actionUrl; profile.paypalStatus = "pending"; await profile.save();
    res.json({ success: true, data: { url: referral.actionUrl } });
  } catch (err) { next(err); }
});

router.post("/paypal/complete", protect, async (req, res, next) => {
  try {
    const profile = await MerchantProfile.findOne({ owner: req.user._id, paypalTrackingId: String(req.body.trackingId || "") });
    if (!profile) return res.status(404).json({ success: false, message: "Onboarding session not found." });
    const merchantId = clean(req.body.merchantIdInPayPal, 80);
    if (!merchantId || req.body.permissionsGranted !== true || req.body.consentStatus !== true) { profile.paypalStatus = "incomplete"; await profile.save(); return res.status(409).json({ success: false, message: "PayPal onboarding did not return seller consent." }); }
    const status = await paypal.getSellerStatus(merchantId);
    const receivable = status.payments_receivable === true;
    const confirmed = status.primary_email_confirmed === true;
    const permissions = Boolean(status.oauth_third_party);
    profile.paypalMerchantId = merchantId; profile.paypalReceivable = receivable; profile.paypalEmailConfirmed = confirmed; profile.paypalPermissionsGranted = permissions;
    profile.paypalStatus = receivable && confirmed && permissions ? "connected" : "incomplete";
    await profile.save();
    res.json({ success: true, data: { status: profile.paypalStatus, paymentsReceivable: receivable, emailConfirmed: confirmed } });
  } catch (err) { next(err); }
});

router.patch("/:id/verify", protect, restrictTo("admin"), async (req, res, next) => {
  try {
    const profile = await MerchantProfile.findByIdAndUpdate(req.params.id, { claimStatus: req.body.approved === true ? "verified" : "rejected" }, { new: true });
    if (!profile) return res.status(404).json({ success: false, message: "Merchant profile not found." });
    if (profile.shop) await Shop.updateOne({ _id: profile.shop }, { $set: { isVerified: req.body.approved === true } });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

module.exports = router;
