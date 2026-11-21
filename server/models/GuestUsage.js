const mongoose = require("mongoose");

const guestUsageSchema = new mongoose.Schema({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

guestUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GuestUsage", guestUsageSchema);
