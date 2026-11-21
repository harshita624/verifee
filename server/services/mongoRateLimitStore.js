const RateLimitCounter = require("../models/RateLimitCounter");
const crypto = require("crypto");

class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = `rate-limit:${prefix}`;
    this.windowMs = 60_000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  keyFor(key) {
    const digest = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "local-development-only")
      .update(String(key))
      .digest("hex");
    return `${this.prefix}:${digest}`;
  }

  async increment(key) {
    const now = new Date();
    const newExpiry = new Date(now.getTime() + this.windowMs);
    const counter = await RateLimitCounter.findOneAndUpdate(
      { _id: this.keyFor(key) },
      [{ $set: {
        totalHits: {
          $cond: [
            { $gt: ["$expiresAt", { $literal: now }] },
            { $add: [{ $ifNull: ["$totalHits", 0] }, 1] },
            1,
          ],
        },
        expiresAt: {
          $cond: [
            { $gt: ["$expiresAt", { $literal: now }] },
            "$expiresAt",
            { $literal: newExpiry },
          ],
        },
      } }],
      { upsert: true, new: true }
    ).lean();

    return { totalHits: counter.totalHits, resetTime: counter.expiresAt };
  }

  async decrement(key) {
    await RateLimitCounter.updateOne(
      { _id: this.keyFor(key), totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } }
    );
  }

  async get(key) {
    const counter = await RateLimitCounter.findOne({
      _id: this.keyFor(key),
      expiresAt: { $gt: new Date() },
    }).lean();
    return counter ? { totalHits: counter.totalHits, resetTime: counter.expiresAt } : undefined;
  }

  async resetKey(key) {
    await RateLimitCounter.deleteOne({ _id: this.keyFor(key) });
  }
}

module.exports = MongoRateLimitStore;
