const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

  provider: { type: String, enum: ["paypal", "upi"], required: true },
  kind: { type: String, enum: ["pro_plan", "fair_pay"], required: true },
  plan: { type: String, enum: ["monthly", "yearly"] },

  // Why the user is paying. Fair Pay: chosen by the buyer. Pro: always "premium".
  purpose: {
    type: String,
    enum: ["transport", "food", "shopping", "accommodation", "other", "premium"],
    index: true,
  },

  // `amount` is what was charged in `currency` (USD or INR for PayPal, INR for UPI).
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  amountInr: { type: Number },

  status: {
    type: String,
    enum: [
      "created", "approved", "captured", "pending_verification",
      "cancelled", "rejected", "failed", "refunded",
    ],
    default: "created",
    index: true,
  },

  // Verified PayPal record
  paypalOrderId: { type: String, unique: true, sparse: true },
  paypalCaptureId: { type: String, index: true, sparse: true },
  payerEmail: String,
  payerId: String,
  capturedAt: Date, // PayPal's own timestamp for the capture

  // Stored even though no money moved, so we learn why checkouts are abandoned.
  cancel: {
    reason: String, // an id from config/paymentMeta.js, or "skipped"
    note: { type: String, maxlength: 200 },
    at: Date,
  },

  refund: {
    id: String,
    at: Date,
  },

  // Audit trail of PayPal webhook events (deduplicated by event id, newest 30 kept)
  events: {
    type: [{ _id: false, type: String, eventId: String, at: Date }],
    default: [],
  },

  // UPI (manual reconciliation: user pays in their UPI app and submits the UTR)
  upi: {
    txnRef: String,
    utr: String,
    vpa: String,
    payeeName: String,
  },

  metadata: {
    product: String,
    city: String,
    category: String,
    vendorName: String,
    guard: {
      verdict: String,
      scamProbability: Number,
      fairPriceMin: Number,
      fairPriceMax: Number,
    },
  },

  priceReport: { type: mongoose.Schema.Types.ObjectId, ref: "PriceReport" },
  fulfilledAt: Date,
}, { timestamps: true });

// A UTR can only ever be claimed once.
paymentSchema.index({ "upi.utr": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Payment", paymentSchema);