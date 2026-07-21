const mongoose = require("mongoose");

const priceReportSchema = new mongoose.Schema({
  product: { type: String, required: true, trim: true, index: true },
  category: { type: String, required: true },
  pricePaid: { type: Number, required: true, min: 0 },
  shopName: { type: String, trim: true },
  city: { type: String, required: true, trim: true, index: true },
  state: { type: String, trim: true },
  marketName: { type: String, trim: true },
  gpsLat: Number,
  gpsLng: Number,
  images: [{ type: String }],
  receiptUrl: { type: String },
  ocrData: {
    extractedProduct: String,
    extractedAmount: Number,
    extractedDate: String,
    extractedShop: String,
    confidence: Number,
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  helpfulVotes: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  aiConfidence: { type: Number, default: 0 },
}, { timestamps: true });

priceReportSchema.index({ product: "text", city: 1, category: 1 });

module.exports = mongoose.model("PriceReport", priceReportSchema);