const mongoose = require("mongoose");

const scamReportSchema = new mongoose.Schema({
  product:       { type: String, required: true, trim: true, index: true },
  city:          { type: String, required: true, trim: true, index: true },
  marketName:    { type: String, trim: true },
  chargedPrice:  { type: Number, required: true },
  fairPrice:     { type: Number },
  description:   { type: String, maxlength: 600 },
  severity: {
    type: String,
    enum: ["high", "medium", "low"],
    default: "medium",
  },
  reportedBy:    { type: String, default: "Anonymous" },
  reportedAt:    { type: Date, default: Date.now },
  verified:      { type: Boolean, default: false },
  upvotes:       { type: Number, default: 0 },
  submittedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category:      { type: String },
}, { timestamps: true });

scamReportSchema.index({ city: 1, reportedAt: -1 });
scamReportSchema.index({ product: "text" });

// Auto-calculate severity
scamReportSchema.pre("save", function(next) {
  if (this.chargedPrice && this.fairPrice) {
    const pct = ((this.chargedPrice - this.fairPrice) / this.fairPrice) * 100;
    this.severity = pct >= 100 ? "high" : pct >= 40 ? "medium" : "low";
  }
  next();
});

module.exports = mongoose.model("ScamReport", scamReportSchema);