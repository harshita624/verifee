const mongoose = require("mongoose");

// Stores the AI's price estimate for a product + city + place so every feature
// (Check Price, Scam Detector, Fair Pay) sees the SAME numbers, and so a server
// restart or Render cold start doesn't change the answer.
const estimateCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB deletes expired documents automatically.
estimateCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EstimateCache", estimateCacheSchema);