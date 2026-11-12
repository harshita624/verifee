const express = require("express");
const { protect } = require("../middleware/auth");
const TravelTrip = require("../models/TravelTrip");
const providers = require("../services/travelProviders");
const priceEngine = require("../services/priceEngine");

const router = express.Router();
const validCurrency = (v) => /^[A-Z]{3}$/.test(String(v || "").toUpperCase());
const clean = (v, max = 120) => String(v || "").trim().slice(0, max);
const haversine = (a, b, c, d) => {
  const rad = (n) => n * Math.PI / 180;
  const x = Math.sin(rad(c-a)/2) ** 2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};

router.post("/route", async (req, res) => {
  try {
    const pickup = clean(req.body.pickup);
    const destination = clean(req.body.destination);
    const city = clean(req.body.city, 80);
    if (pickup.length < 3 || destination.length < 3) return res.status(400).json({ success: false, message: "Enter both pickup and destination." });
    const trip = await providers.route(city ? `${pickup}, ${city}, India` : pickup, city ? `${destination}, ${city}, India` : destination);
    const km = trip.routes[0].distanceKm;
    const meters = Math.max(0, km * 1000);
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(trip.from.label)}&destination=${encodeURIComponent(trip.to.label)}&travelmode=driving`;
    const auto = { low: Math.round(25 + km * 12), high: Math.round(35 + km * 18) };
    const cab = { low: Math.round(50 + km * 16), high: Math.round(80 + km * 24) };
    const options = [
      { mode: "Auto-rickshaw", fareMin: auto.low, fareMax: auto.high, note: "Indicative city fare; meter, traffic and local rules affect the final fare." },
      { mode: "App cab", fareMin: cab.low, fareMax: cab.high, note: "Indicative estimate only; surge pricing is not included." },
      { mode: "Public transport", fareMin: 10, fareMax: Math.max(10, Math.round(km * 5)), note: "Indicative fallback range; live transit availability and schedules are not connected." },
    ];
    res.json({ success: true, data: {
      pickup: trip.from.label, destination: trip.to.label,
      distanceKm: Number(km.toFixed(1)), durationMinutes: Math.round(trip.routes[0].durationMinutes),
      alternatives: trip.routes.slice(1, 3).map((r, i) => ({ distanceKm: Number(r.distanceKm.toFixed(1)), durationMinutes: Math.round(r.durationMinutes), label: `Driving route ${i+2}` })),
      fareOptions: options, mapUrl: googleUrl,
      source: "OpenStreetMap geocoding + OSRM road routing; fare ranges are Verifee estimates",
    }});
  } catch (err) {
    res.status(503).json({ success: false, message: err.message || "Could not calculate this route." });
  }
});

router.get("/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    const radius = Math.min(5000, Math.max(250, Number(req.query.radius) || 1500));
    const category = ["all", "food", "hotels", "shops", "services"].includes(req.query.category) ? req.query.category : "all";
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180)
      return res.status(400).json({ success: false, message: "Allow location access or provide valid map coordinates." });
    const places = await providers.nearby(lat, lng, radius, category);
    const data = places.map((p) => ({ ...p, distanceKm: Number(haversine(lat, lng, p.lat, p.lng).toFixed(2)), mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` }))
      .sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 40);
    res.json({ success: true, data, source: "OpenStreetMap", freshness: "Community-maintained map data; call ahead to confirm details." });
  } catch (err) {
    res.status(503).json({ success: false, message: err.message || "Nearby search is unavailable." });
  }
});

router.get("/currencies", async (req, res) => {
  try {
    const base = String(req.query.base || "INR").toUpperCase();
    if (!validCurrency(base)) return res.status(400).json({ success: false, message: "Use a three-letter currency code." });
    const data = await providers.rates(base);
    res.set("Cache-Control", "public, max-age=900");
    res.json({ success: true, data });
  } catch (err) { res.status(503).json({ success: false, message: err.message }); }
});

router.get("/trips", protect, async (req, res, next) => {
  try { const trips = await TravelTrip.find({ owner: req.user._id }).sort({ updatedAt: -1 }).lean(); res.json({ success: true, data: trips }); }
  catch (err) { next(err); }
});

router.post("/trips", protect, async (req, res, next) => {
  try {
    const name = clean(req.body.name, 100), city = clean(req.body.city, 100);
    const budget = Number(req.body.budget), currency = String(req.body.currency || "INR").toUpperCase(), homeCurrency = String(req.body.homeCurrency || currency).toUpperCase();
    if (!name || !city || !Number.isFinite(budget) || budget < 0 || !validCurrency(currency) || !validCurrency(homeCurrency))
      return res.status(400).json({ success: false, message: "Enter a trip name, destination, valid budget and currency codes." });
    const trip = await TravelTrip.create({ owner: req.user._id, name, city, budget, currency, homeCurrency, startsAt: req.body.startsAt || undefined, endsAt: req.body.endsAt || undefined });
    res.status(201).json({ success: true, data: trip });
  } catch (err) { next(err); }
});

router.patch("/trips/:id", protect, async (req, res, next) => {
  try {
    const patch = {};
    for (const key of ["name", "city"]) if (req.body[key] !== undefined) patch[key] = clean(req.body[key], 100);
    if (req.body.budget !== undefined && Number(req.body.budget) >= 0) patch.budget = Number(req.body.budget);
    for (const key of ["currency", "homeCurrency"]) if (req.body[key] !== undefined && validCurrency(String(req.body[key]).toUpperCase())) patch[key] = String(req.body[key]).toUpperCase();
    const trip = await TravelTrip.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $set: patch }, { new: true, runValidators: true });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

router.delete("/trips/:id", protect, async (req, res, next) => {
  try { const result = await TravelTrip.deleteOne({ _id: req.params.id, owner: req.user._id }); if (!result.deletedCount) return res.status(404).json({ success: false, message: "Trip not found." }); res.json({ success: true }); }
  catch (err) { next(err); }
});

router.post("/trips/:id/expenses", protect, async (req, res, next) => {
  try {
    const label = clean(req.body.label), amount = Number(req.body.amount), currency = String(req.body.currency || "INR").toUpperCase();
    if (!label || !Number.isFinite(amount) || amount <= 0 || !validCurrency(currency)) return res.status(400).json({ success: false, message: "Enter an expense label, positive amount and currency." });
    const trip = await TravelTrip.findOne({ _id: req.params.id, owner: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    let amountHome = null;
    try {
      if (currency === trip.currency) amountHome = amount;
      else { const fx = await providers.rates(currency); const converted = fx.rates[trip.currency]; if (Number.isFinite(converted)) amountHome = Number((amount * converted).toFixed(2)); }
    } catch {}
    trip.expenses.push({ label, category: clean(req.body.category, 40) || "other", amount, currency, amountHome, homeCurrency: trip.currency, merchant: clean(req.body.merchant, 100), note: clean(req.body.note, 300), spentAt: req.body.spentAt || new Date() });
    await trip.save(); res.status(201).json({ success: true, data: trip });
  } catch (err) { next(err); }
});

router.delete("/trips/:id/expenses/:expenseId", protect, async (req, res, next) => {
  try { const trip = await TravelTrip.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $pull: { expenses: { _id: req.params.expenseId } } }, { new: true }); if (!trip) return res.status(404).json({ success: false, message: "Trip not found." }); res.json({ success: true, data: trip }); }
  catch (err) { next(err); }
});

router.post("/trips/:id/alerts", protect, async (req, res, next) => {
  try {
    const product = clean(req.body.product), targetPrice = Number(req.body.targetPrice), currency = String(req.body.currency || "INR").toUpperCase();
    if (!product || !Number.isFinite(targetPrice) || targetPrice <= 0 || !validCurrency(currency)) return res.status(400).json({ success: false, message: "Enter a product and a positive target price." });
    const trip = await TravelTrip.findOne({ _id: req.params.id, owner: req.user._id }); if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    trip.alerts.push({ product, targetPrice, currency }); await trip.save(); res.status(201).json({ success: true, data: trip });
  } catch (err) { next(err); }
});

router.delete("/trips/:id/alerts/:alertId", protect, async (req, res, next) => {
  try { const trip = await TravelTrip.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { $pull: { alerts: { _id: req.params.alertId } } }, { new: true }); if (!trip) return res.status(404).json({ success: false, message: "Trip not found." }); res.json({ success: true, data: trip }); }
  catch (err) { next(err); }
});

router.get("/trips/:id/alerts/check", protect, async (req, res, next) => {
  try {
    const trip = await TravelTrip.findOne({ _id: req.params.id, owner: req.user._id }).lean(); if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    const alerts = await Promise.all((trip.alerts || []).filter((a) => a.active).map(async (a) => {
      try { const est = await priceEngine.estimate({ product: a.product, city: trip.city }); const rate = a.currency === "INR" ? 1 : (await providers.rates("INR")).rates[a.currency]; const max = rate ? est.fairMax * rate : est.fairMax; return { ...a, currentFairMax: Math.round(max), reachedTarget: max <= a.targetPrice, estimateSource: est.dataSource, dataPoints: est.dataPoints }; }
      catch { return { ...a, reachedTarget: false, unavailable: true }; }
    }));
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
});

module.exports = router;
