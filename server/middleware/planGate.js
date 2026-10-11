const User = require("../models/User");

const FREE_LIMIT = Number(process.env.FREE_DAILY_PREMIUM_CALLS) || 3;

// Guests are counted per IP per day, in memory (fine for a single instance).
const guestUsage = new Map();
const today = () => new Date().toISOString().slice(0, 10);

setInterval(() => {
  const t = today();
  for (const key of guestUsage.keys()) {
    if (!key.endsWith(`:${t}`)) guestUsage.delete(key);
  }
}, 60 * 60 * 1000).unref();

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
    let used;
    let refund;

    if (user) {
      used = user.aiUsage?.date === date ? user.aiUsage.count || 0 : 0;
      if (used >= FREE_LIMIT) return deny(res);
      await User.updateOne(
        { _id: user._id },
        { $set: { "aiUsage.date": date, "aiUsage.count": used + 1 } }
      );
      refund = () =>
        User.updateOne(
          { _id: user._id, "aiUsage.date": date, "aiUsage.count": { $gt: 0 } },
          { $inc: { "aiUsage.count": -1 } }
        );
    } else {
      const key = `${req.ip}:${date}`;
      used = guestUsage.get(key) || 0;
      if (used >= FREE_LIMIT) return deny(res);
      guestUsage.set(key, used + 1);
      refund = async () => guestUsage.set(key, Math.max(0, (guestUsage.get(key) || 1) - 1));
    }

    res.setHeader("X-Plan", "free");
    res.setHeader("X-Free-Remaining", String(Math.max(0, FREE_LIMIT - used - 1)));
    res.on("finish", () => {
      if (res.statusCode >= 400) Promise.resolve(refund()).catch(() => {});
    });
    next();
  } catch (err) {
    next(err);
  }
};