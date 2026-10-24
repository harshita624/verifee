// Single source of truth for "why are you paying?" and "why did you cancel?".
// The server validates against these lists and sends them to the client via
// GET /api/v1/payments/config, so the two can never drift apart.

// Fair Pay (paying a vendor) asks the buyer to pick one of these.
const PURPOSES = [
  { id: "transport",     label: "Transport" },
  { id: "food",          label: "Food" },
  { id: "shopping",      label: "Shopping" },
  { id: "accommodation", label: "Accommodation" },
  { id: "other",         label: "Something else" },
];

// A Pro purchase never asks: its purpose is always "premium".
const PREMIUM_PURPOSE = "premium";

// Reasons differ by purchase type. "skipped" (user closed the question) is always accepted.
const CANCEL_REASONS = {
  fair_pay: [
    { id: "price_too_high",       label: "The price is too high" },
    { id: "seller_changed_price", label: "The seller changed the price" },
    { id: "chose_another_seller", label: "I chose another seller" },
    { id: "other",                label: "Other" },
  ],
  pro_plan: [
    { id: "price_too_high",  label: "The price is too high" },
    { id: "not_needed_now",  label: "I do not need Pro right now" },
    { id: "just_exploring",  label: "I was just exploring" },
    { id: "payment_problem", label: "I had a problem paying" },
    { id: "other",           label: "Other" },
  ],
};

module.exports = { PURPOSES, PREMIUM_PURPOSE, CANCEL_REASONS };