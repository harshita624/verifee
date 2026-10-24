// Add or edit posts here. Each post renders on /blog.
// Dates are optional: add `date: "12 Oct 2026"` to a post when you publish it.

export const POSTS = [
  {
    id: "how-fair-price-works",
    tag: "How it works",
    title: "How Verifee decides what a fair price is",
    summary: "Community receipts first, a labeled AI estimate second, and one shared answer across every page.",
    body: [
      "Every price check starts by looking for verified community receipts for the same item in the same city. When at least three exist, the fair range is based on what real buyers paid, and the verdict shows how the quote compares with those local prices.",
      "When there are fewer than three receipts, we ask an AI model for an estimate of what a local pays in a physical market. That estimate is always labeled “AI estimate” and carries a lower confidence score.",
      "The estimate is saved for 24 hours. This matters more than it sounds: AI models can answer the same question slightly differently each time, and a price tool that disagrees with itself is not trustworthy. Check Price, the Scam Detector and Fair Pay all read the same saved estimate, so the same item shows the same range everywhere.",
      "The scam probability is based on the numbers: where your quote sits relative to the fair range and verified community prices. The AI only writes the words you can say to the vendor.",
    ],
  },
  {
    id: "pay-guard",
    tag: "Payments",
    title: "AI Pay Guard: check the price before the money moves",
    summary: "Why Fair Pay refuses to create a PayPal order until the price has been checked.",
    body: [
      "Most payment apps ask you to confirm an amount. They do not tell you whether the amount is reasonable. Fair Pay adds that step. You scan the vendor’s UPI QR, say what you are buying, and the Pay Guard compares the quote with the fair range and suggests a counter-offer.",
      "If you pay with PayPal, the Pay Guard result is turned into a short-lived signed token that is tied to the exact amount. The server will not create a PayPal order without a valid token, and it rejects the order if the amount no longer matches. If the verdict is “likely overpriced”, you must explicitly confirm before paying.",
      "If you pay by UPI, the payment goes straight from your UPI app to the vendor. Verifee generates the payment QR but never handles that money.",
      "A completed PayPal payment through Fair Pay is also useful data: it becomes a verified community price report, which improves the answers for the next traveler.",
    ],
  },
  {
    id: "ai-labels",
    tag: "Transparency",
    title: "Why we label every AI estimate",
    summary: "An AI answer that sounds confident is not the same as a price someone actually paid.",
    body: [
      "Language models are good at producing plausible numbers. Plausible is not the same as verified. So Verifee marks every number with where it came from: “community verified” with the number of receipts behind it, or “AI estimate” with a confidence score.",
      "You will see the AI-estimate label on new items and in cities with little data. That is deliberate. It tells you to treat the range as a starting point and to contribute your own receipt so the next answer is better.",
      "If an item name is vague, for example just “bed”, the range will be wide, because a bed can be anything from a simple frame to carved teak. The more specific you are about size, material and quality, the tighter the estimate.",
    ],
  },
];
