const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true },
  state: { type: String },
  address: { type: String },
  marketName: { type: String },
  gpsLat: Number,
  gpsLng: Number,
  category: { type: String },
  categories: [String],
  description: { type: String },
  images: [String],
  phone: String,
  website: String,
  fairPriceScore: { type: Number, default: 0, min: 0, max: 100 },
  touristFriendlyScore: { type: Number, default: 0, min: 0, max: 100 },
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  negotiationSuccessRate: { type: Number, default: 0 },
  peakHours: [String],
  languages: [String],
  acceptsCards: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  totalReviews: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  openNow: { type: Boolean, default: true },
  openingHours: { type: String },
  popularProducts: [String],
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

shopSchema.index({ city: 1, category: 1, trustScore: -1 });
shopSchema.index({ name: "text", city: "text", description: "text" });

module.exports = mongoose.model("Shop", shopSchema);