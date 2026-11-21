const mongoose = require("mongoose");

const rateLimitCounterSchema = new mongoose.Schema({
  _id: { type: String },
  totalHits: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

rateLimitCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimitCounter", rateLimitCounterSchema);
