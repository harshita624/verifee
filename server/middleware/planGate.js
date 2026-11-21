const User = require("../models/User");
const GuestUsage = require("../models/GuestUsage");
const crypto = require("crypto");

const FREE_LIMIT = Number(process.env.FREE_DAILY_PREMIUM_CALLS) || 3;

const today = () => new Date().toISOString().slice(0, 10);
const guestKey = (ip, date) => `${crypto.createHmac("sha256", process.env.JWT_SECRET || "local-development-only").update(String(ip || "unknown")).digest("hex")}:${date}`;

function deny(res) {
  return res.status(402).json({
    success: false,
    code: "UPGRADE_REQUIRED",
    message: `You've used your ${FREE_LIMIT} free premium AI actions for today. Upgrade to Verifee Pro for unlimited use.`,
    upgradeUrl: "/pricing",
  });
}

/**
 * planGate("premium") — place AFTER optionalAuth.
 * Pro members pass through. Everyone else gets FREE_LIMIT calls per day.
 * Calls that end in an error (status >= 400) are refunded so a failed AI
 * request never burns the user's quota.
 */
exports.planGate = () => async (req, res, next) => {
  try {
    if (req.method !== "POST") return next();

    const user = req.user;
    if (user && user.plan === "pro" && user.planExpires && user.planExpires.getTime() > Date.now()) {
      res.setHeader("X-Plan", "pro");
      return next();
    }

    const date = today();
    let refund;
    let usedAfterReservation;

    if (user) {
      // Reserve a slot atomically for the current UTC day. A second attempt
      // handles a concurrent request that rolled the account into a new day.
      let reservation = await User.updateOne(
        { _id: user._id, "aiUsage.date": date, "aiUsage.count": { $lt: FREE_LIMIT } },
        { $inc: { "aiUsage.count": 1 } }
      );
      if (!reservation.matchedCount) {
        reservation = await User.updateOne(
          { _id: user._id, "aiUsage.date": { $ne: date } },
          { $set: { "aiUsage.date": date, "aiUsage.count": 1 } }
        );
      }
      if (!reservation.matchedCount) {
        reservation = await User.updateOne(
          { _id: user._id, "aiUsage.date": date, "aiUsage.count": { $lt: FREE_LIMIT } },
          { $inc: { "aiUsage.count": 1 } }
        );
      }
      if (!reservation.matchedCount) return deny(res);
      const latestUser = await User.findById(user._id).select("aiUsage.count").lean();
      usedAfterReservation = latestUser?.aiUsage?.count || 0;
      refund = () =>
        User.updateOne(
          { _id: user._id, "aiUsage.date": date, "aiUsage.count": { $gt: 0 } },
          { $inc: { "aiUsage.count": -1 } }
        );
    } else {
      const key = guestKey(req.ip, date);
      const expiresAt = new Date(`${date}T00:00:00.000Z`);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 2);
      const usage = await GuestUsage.findOneAndUpdate(
        { _id: key },
        [{ $set: {
          count: { $min: [FREE_LIMIT + 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
          expiresAt: { $ifNull: ["$expiresAt", { $literal: expiresAt }] },
        } }],
        { upsert: true, new: true }
      ).lean();
      if (usage.count > FREE_LIMIT) return deny(res);
      usedAfterReservation = usage.count;
      refund = () => GuestUsage.updateOne({ _id: key, count: { $gt: 0 } }, { $inc: { count: -1 } });
    }

    res.setHeader("X-Plan", "free");
    res.setHeader("X-Free-Remaining", String(Math.max(0, FREE_LIMIT - usedAfterReservation)));
    res.on("finish", () => {
      if (res.statusCode >= 400) Promise.resolve(refund()).catch(() => {});
    });
    next();
  } catch (err) {
    next(err);
  }
};
