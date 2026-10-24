function extractLastPrice(text) {
  const matches = [...String(text || "").matchAll(/(?:₹|rs\.?\s*|inr\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand)?\b/gi)];
  if (!matches.length) return null;
  const match = matches[matches.length - 1];
  const number = Number(match[1].replace(/,/g, ""));
  const price = /^(k|thousand)$/i.test(match[2] || "") ? number * 1000 : number;
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

const inr = (value) => Math.round(value).toLocaleString("en-IN");

function safeLiveReply({ sellerPrice, targetPrice, lang = "en" }) {
  const target = Number(targetPrice);
  const hasTarget = Number.isFinite(target) && target > 0;
  const shouldAccept = hasTarget && sellerPrice <= target;
  if (shouldAccept) {
    const say = lang === "hi"
      ? `₹${inr(sellerPrice)} theek hai, chaliye final karte hain.`
      : `₹${inr(sellerPrice)} works for me. Let's finalize.`;
    return {
      say,
      romanized: lang === "hi" ? say : "",
      strategy: "The seller's offer is at or below your target, so don't offer a higher price.",
      nextMove: "Confirm that this is the full price, with no extra charges.",
    };
  }

  const targetRounded = Math.round((hasTarget ? target : sellerPrice * 0.95) / 10) * 10;
  const offer = Math.min(targetRounded, Math.floor((sellerPrice * 0.95) / 10) * 10);
  const safeOffer = Math.max(1, Math.min(offer, sellerPrice));
  const say = lang === "hi"
    ? `₹${inr(safeOffer)} mein final kar dein? Main abhi le loon?`
    : `Could you do ₹${inr(safeOffer)}? I can buy it now.`;
  return {
    say,
    romanized: lang === "hi" ? say : "",
    strategy: "This counter stays below the seller's offer and your target.",
    nextMove: "If they refuse, negotiate in small steps and stay within your budget.",
  };
}

module.exports = { extractLastPrice, safeLiveReply, inr };
