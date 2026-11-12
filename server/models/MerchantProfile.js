const mongoose = require("mongoose");

const merchantProfileSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, trim: true, maxlength: 50 },
  description: { type: String, trim: true, maxlength: 500 },
  phone: { type: String, trim: true, maxlength: 30 },
  website: { type: String, trim: true, maxlength: 200 },
  claimStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  paypalMerchantId: { type: String, trim: true, maxlength: 80 },
  paypalTrackingId: { type: String, trim: true, maxlength: 80 },
  paypalReferralId: { type: String, trim: true, maxlength: 160 },
  paypalReferralUrl: { type: String, trim: true, maxlength: 500 },
  paypalStatus: { type: String, enum: ["not_started", "pending", "connected", "incomplete"], default: "not_started" },
  paypalReceivable: { type: Boolean, default: false },
  paypalEmailConfirmed: { type: Boolean, default: false },
  paypalPermissionsGranted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("MerchantProfile", merchantProfileSchema);
