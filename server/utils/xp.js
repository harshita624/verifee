const User = require("../models/User");

const levelForXp = (xp) => Math.floor((xp || 0) / 1000) + 1;

/**
 * Atomically add XP (and optional extra counters), then keep `level` and
 * XP-based badges in sync. Previously XP was $inc'd in several controllers
 * but `level` never changed, so every user stayed at Level 1 forever.
 */
async function awardXp(userId, amount, extraInc = {}) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { xp: amount, ...extraInc } },
    { new: true }
  );
  if (!user) return null;

  const level = levelForXp(user.xp);
  const update = {};
  if (level !== user.level) update.$set = { level };
  if (user.xp >= 1000 && !(user.badges || []).includes("top_contributor")) {
    update.$addToSet = { badges: "top_contributor" };
  }
  if (Object.keys(update).length) await User.updateOne({ _id: user._id }, update);

  return { xp: user.xp, level };
}

module.exports = { awardXp, levelForXp };