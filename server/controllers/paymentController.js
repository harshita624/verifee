const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Payment = require("../models/Payment");
const User = require("../models/User");
const PriceReport = require("../models/PriceReport");
const paypal = require("../services/paypalService");
const priceEngine = require("../services/priceEngine");
const aiService = require("../services/aiService");
const { awardXp } = require("../utils/xp");

// ── Config ───────────────────────────────────────────────────────────────────

const PLANS = {
  monthly: { id: "monthly", name: "Pro Monthly", days: 30, usd: 4.99, inr: 399 },
  yearly: { id: "yearly", name: "Pro Yearly", days: 365, usd: 39.99, inr: 3199 },
};

// PayPal charges in USD by default. Set PAYPAL_CURRENCY=INR only if your
// PayPal business account is enabled for INR.
const PAY_CURRENCY = (process.env.PAYPAL_CURRENCY || "USD").toUpperCase() === "INR" ? "INR" : "USD";
const INR_PER_USD = Number(process.env.INR_PER_USD) || 88;

const CATEGORY_IDS = [
  "textiles", "handicrafts", "jewelry", "food", "hotels",
  "transport", "electronics", "souvenirs", "fruits", "tickets",
];

const round2 = (n) => Math.round(n * 100) / 100;
const planAmount = (plan) => (PAY_CURRENCY === "INR" ? plan.inr : plan.usd);
const inrToPay = (inr) =>
  PAY_CURRENCY === "INR" ? round2(inr) : Math.max(0.01, round2(inr / INR_PER_USD));

function httpError(status, message) {
  const err = new Error(message);
  err.statusCode = status;
  return err;
}

const serializePayment = (p) => ({
  id: p._id,
  provider: p.provider,
  kind: p.kind,
  plan: p.plan,
  amount: p.amount,
  currency: p.currency,
  amountInr: p.amountInr,
  status: p.status,
  createdAt: p.createdAt,
  metadata: p.metadata,
  upi: p.upi ? { txnRef: p.upi.txnRef } : undefined,
});

exports.getConfig = (req, res) => {
  res.json({
    success: true,
    data: {
      plans: Object.values(PLANS),
      paypal: {
        enabled: paypal.isConfigured(),
        clientId: process.env.PAYPAL_CLIENT_ID || null, // public by design
        env: paypal.ENV,
        currency: PAY_CURRENCY,
      },
      upi: {
        enabled: Boolean(process.env.UPI_MERCHANT_VPA),
        merchantName: process.env.UPI_MERCHANT_NAME || "Verifee",
      },
      inrPerUsd: INR_PER_USD,
      freeDailyPremiumCalls: Number(process.env.FREE_DAILY_PREMIUM_CALLS) || 3,
    },
  });
};

// ── Fulfilment (shared by capture, webhook, UPI approval) ────────────────────

async function grantPlan(payment) {
  const plan = PLANS[payment.plan];
  const user = await User.findById(payment.user);
  if (!user || !plan) return;
  const now = Date.now();
  const base =
    user.plan === "pro" && user.planExpires && user.planExpires.getTime() > now
      ? user.planExpires.getTime()
      : now;
  user.plan = "pro";
  user.planExpires = new Date(base + plan.days * 86_400_000);
  await user.save({ validateBeforeSave: false });
}

// A captured Fair Pay payment is the strongest price evidence Verifee can get,
// so it becomes a verified community report automatically.
async function createVerifiedReport(payment) {
  const m = payment.metadata || {};
  if (!m.product || !m.city) return;
  const report = await PriceReport.create({
    product: m.product,
    category: m.category || "souvenirs",
    pricePaid: payment.amountInr,
    city: m.city,
    shopName: m.vendorName || undefined,
    submittedBy: payment.user,
    isVerified: true,
    source: "paypal",
    aiConfidence: 90,
    paymentRef: payment._id,
  });
  payment.priceReport = report._id;
  await payment.save();
  await awardXp(payment.user, 80, { contributionCount: 1 });
}

/**
 * Atomically claims the payment (status → captured) so a webhook and a browser
 * capture racing each other can never grant the plan twice.
 */
async function fulfil(paymentId, info = {}) {
  const set = { status: "captured", fulfilledAt: new Date() };
  if (info.captureId) set.paypalCaptureId = info.captureId;
  if (info.payerEmail) set.payerEmail = info.payerEmail;
  if (info.payerId) set.payerId = info.payerId;

  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $nin: ["captured", "refunded"] } },
    { $set: set },
    { new: true }
  );
  if (!payment) return { payment: await Payment.findById(paymentId), duplicate: true };

  try {
    if (payment.kind === "pro_plan") await grantPlan(payment);
    else if (payment.kind === "fair_pay") await createVerifiedReport(payment);
  } catch (err) {
    // Money is already captured; never throw away the payment record.
    console.error("fulfil side-effect failed for payment", String(payment._id), err.message);
  }
  return { payment, duplicate: false };
}

async function respondCaptured(res, payment, userId) {
  const user = await User.findById(userId);
  res.json({
    success: true,
    message: payment.kind === "pro_plan" ? "Payment successful. Verifee Pro is active." : "Payment successful.",
    data: { payment: serializePayment(payment), user },
  });
}

// ── AI Pay Guard ─────────────────────────────────────────────────────────────

/**
 * Checks a quoted price BEFORE money moves. It uses the SAME price engine as
 * Check Price and the Scam Detector (cached estimate, or community statistics
 * when available), so the three pages can never disagree. The LLM only writes
 * the counter-offer words. A short-lived signed token binds the verdict to the
 * exact amount; PayPal Fair Pay refuses to create an order without it.
 */
exports.guard = async (req, res, next) => {
  try {
    const product = String(req.body.product || "").trim();
    const city = String(req.body.city || "").trim();
    const place = String(req.body.place || "").trim();
    const vendorName = String(req.body.vendorName || "").trim().slice(0, 80);
    const price = round2(Number(req.body.quotedPriceInr));

    if (product.length < 2) throw httpError(400, "Tell us what you are buying.");
    if (!Number.isFinite(price) || price < 1 || price > 200000)
      throw httpError(400, "Enter the quoted price in rupees (₹1 – ₹2,00,000).");

    let a;
    try {
      a = await priceEngine.assess({ product, city, place, price });
    } catch (e) {
      console.warn("guard: price engine failed:", e.message);
      throw httpError(503, "Could not estimate a fair price right now. Please try again in a moment.");
    }

    const { est, scamProbability, verdict, overpricingPercent, zScore } = a;
    const fairMin = est.fairMin;
    const fairMax = est.fairMax;
    const dataSource = est.dataSource;
    const dataPoints = est.dataPoints;

    // LLM: counter-offer + words to say. Falls back to a deterministic answer.
    let counterOffer = est.bargainingTarget;
    let say = `I know the usual price for this is around ₹${Math.round(fairMax).toLocaleString("en-IN")}. Can you do ₹${Math.round(est.bargainingTarget).toLocaleString("en-IN")}?`;
    let sayHindi = "";
    let why = "";
    try {
      const raw = await aiService.callAIRaw(
        `Product: "${est.product}". City: ${city || "India"}${place ? `, ${place}` : ""}${vendorName ? `. Vendor: ${vendorName}` : ""}.\n` +
          `The vendor quoted ₹${price}. Fair range is ₹${Math.round(fairMin)}–₹${Math.round(fairMax)} (${dataSource === "community_verified" ? `from ${dataPoints} verified community receipts` : "AI estimate"}).\n` +
          `Verdict: ${verdict}.\n` +
          `Return JSON: {"counterOfferInr": <number to offer now>, "say": "<one polite sentence in English to say to the vendor>", "sayHindi": "<same sentence in Hindi, Roman letters>", "why": "<one sentence on why this works>"}`,
        "You are a negotiation coach for Indian markets. Return ONLY valid JSON. No markdown.",
        { maxTokens: 600, timeoutMs: 20000, temperature: 0.2, json: true }
      );
      const r = aiService.parseJSON(raw, { requiredFields: ["say"] });
      const c = Number(r.counterOfferInr);
      if (Number.isFinite(c) && c > 0) counterOffer = Math.round(c);
      say = String(r.say).slice(0, 300);
      sayHindi = String(r.sayHindi || "").slice(0, 300);
      why = String(r.why || "").slice(0, 300);
    } catch (e) {
      console.warn("guard: AI script failed:", e.message);
    }
    counterOffer = Math.min(Math.round(price), Math.max(Math.round(fairMin * 0.8), counterOffer));

    const guardToken = jwt.sign(
      {
        purpose: "pay_guard",
        product: est.product,
        city,
        amountInr: price,
        verdict,
        p: scamProbability,
        fmin: Math.round(fairMin),
        fmax: Math.round(fairMax),
        uid: req.user ? String(req.user._id) : undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.json({
      success: true,
      data: {
        product: est.product,
        city,
        quotedPriceInr: price,
        verdict,
        scamProbability,
        overpricingPercent,
        fairPriceMin: Math.round(fairMin),
        fairPriceMax: Math.round(fairMax),
        recommendedMax: Math.round(fairMax),
        counterOffer,
        say,
        sayHindi,
        why,
        zScore,
        dataSource,
        dataPoints,
        hint: est.hint,
        requiresConfirmation: verdict === "Scam",
        guardToken,
        expiresInMinutes: 30,
      },
    });
  } catch (err) {
    next(err);
  }
};

function readGuardToken(token, user) {
  if (!token) throw httpError(400, "Run the AI Pay Guard before paying.");
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(400, "The AI check expired. Run the Pay Guard again.");
  }
  if (payload.purpose !== "pay_guard") throw httpError(400, "Invalid AI check.");
  if (payload.uid && user && payload.uid !== String(user._id))
    throw httpError(403, "This AI check belongs to a different account.");
  return payload;
}

// ── PayPal ───────────────────────────────────────────────────────────────────

exports.createPaypalOrder = async (req, res, next) => {
  try {
    if (!paypal.isConfigured()) throw httpError(503, "PayPal is not configured on this server.");

    const { kind } = req.body;
    let doc;

    if (kind === "pro_plan") {
      const plan = PLANS[req.body.plan];
      if (!plan) throw httpError(400, "Choose a valid plan.");
      doc = {
        kind,
        plan: plan.id,
        amount: planAmount(plan),
        amountInr: plan.inr,
        description: `Verifee ${plan.name}`,
        metadata: {},
      };
    } else if (kind === "fair_pay") {
      const guard = readGuardToken(req.body.guardToken, req.user);
      const amountInr = round2(Number(req.body.amountInr));
      if (!Number.isFinite(amountInr) || amountInr < 1 || amountInr > 200000)
        throw httpError(400, "Enter an amount between ₹1 and ₹2,00,000.");
      if (Math.abs(amountInr - guard.amountInr) > 0.009)
        throw httpError(409, "The amount changed after the AI check. Run the Pay Guard again.");
      if (guard.verdict === "Scam" && req.body.confirmRisk !== true)
        throw httpError(409, "AI Pay Guard flagged this price as likely overpriced. Confirm that you want to continue.");

      const category = CATEGORY_IDS.includes(req.body.category) ? req.body.category : "souvenirs";
      const vendorName = String(req.body.vendorName || "").trim().slice(0, 80);
      doc = {
        kind,
        amount: inrToPay(amountInr),
        amountInr,
        description: `Verifee Fair Pay - ${guard.product}`,
        metadata: {
          product: guard.product,
          city: guard.city,
          category,
          vendorName,
          guard: {
            verdict: guard.verdict,
            scamProbability: guard.p,
            fairPriceMin: guard.fmin,
            fairPriceMax: guard.fmax,
          },
        },
      };
    } else {
      throw httpError(400, "Unknown payment kind.");
    }

    const payment = await Payment.create({
      user: req.user._id,
      provider: "paypal",
      kind: doc.kind,
      plan: doc.plan,
      amount: doc.amount,
      currency: PAY_CURRENCY,
      amountInr: doc.amountInr,
      status: "created",
      metadata: doc.metadata,
    });

    try {
      const order = await paypal.createOrder({
        amount: doc.amount,
        currency: PAY_CURRENCY,
        description: doc.description,
        referenceId: String(payment._id),
        customId: String(payment._id),
        requestId: `create-${payment._id}`,
      });
      payment.paypalOrderId = order.id;
      await payment.save();
      res.status(201).json({
        success: true,
        data: { orderId: order.id, paymentId: payment._id, amount: doc.amount, currency: PAY_CURRENCY },
      });
    } catch (err) {
      payment.status = "failed";
      await payment.save().catch(() => {});
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

exports.capturePaypalOrder = async (req, res, next) => {
  try {
    const orderId = String(req.body.orderId || "");
    if (!/^[A-Z0-9-]{8,40}$/i.test(orderId)) throw httpError(400, "Invalid order id.");

    const payment = await Payment.findOne({ paypalOrderId: orderId, user: req.user._id });
    if (!payment) throw httpError(404, "Order not found.");
    if (payment.status === "captured") return respondCaptured(res, payment, req.user._id);

    let order;
    try {
      order = await paypal.captureOrder(orderId, `capture-${payment._id}`);
    } catch (err) {
      if (err.paypal?.issue === "ORDER_ALREADY_CAPTURED") order = await paypal.getOrder(orderId);
      else throw err;
    }

    const cap = paypal.extractCapture(order);
    if (!cap) throw httpError(502, "PayPal did not return a capture for this order.");

    if (cap.status !== "COMPLETED") {
      payment.status = "approved";
      await payment.save();
      return res.status(202).json({
        success: true,
        message: "Your payment is pending with PayPal. It will be applied as soon as it clears.",
        data: { payment: serializePayment(payment) },
      });
    }

    // Never trust the browser: confirm PayPal captured exactly what we asked for.
    if (cap.currency !== payment.currency || Math.abs(cap.value - payment.amount) > 0.009) {
      payment.status = "failed";
      await payment.save();
      console.error("PayPal amount mismatch", String(payment._id), cap, payment.amount, payment.currency);
      throw httpError(409, "The captured amount did not match the order. Please contact support.");
    }

    const { payment: done } = await fulfil(payment._id, {
      captureId: cap.id,
      payerEmail: order.payer?.email_address,
      payerId: order.payer?.payer_id,
    });
    return respondCaptured(res, done, req.user._id);
  } catch (err) {
    next(err);
  }
};

// PayPal → us. Only processed when PAYPAL_WEBHOOK_ID is set and the signature
// verifies; otherwise events are ignored so nobody can forge a plan upgrade.
exports.webhook = async (req, res) => {
  try {
    if (!process.env.PAYPAL_WEBHOOK_ID) return res.json({ success: true, ignored: true });
    if (!(await paypal.verifyWebhook(req.headers, req.body)))
      return res.status(400).json({ success: false, message: "Invalid signature" });

    const event = req.body;
    const resource = event.resource || {};

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      const payment = orderId ? await Payment.findOne({ paypalOrderId: orderId }) : null;
      if (
        payment &&
        payment.status !== "captured" &&
        Math.abs(Number(resource.amount?.value) - payment.amount) <= 0.009 &&
        resource.amount?.currency_code === payment.currency
      ) {
        await fulfil(payment._id, { captureId: resource.id, payerEmail: resource.payer?.email_address });
      }
    }

    if (["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type)) {
      const up = (resource.links || []).find((l) => l.rel === "up")?.href || "";
      const captureId = up.split("/").pop() || resource.id;
      const payment = await Payment.findOne({ paypalCaptureId: captureId });
      if (payment && payment.status === "captured") {
        payment.status = "refunded";
        await payment.save();
        if (payment.kind === "pro_plan") {
          const plan = PLANS[payment.plan];
          const user = await User.findById(payment.user);
          if (user && plan && user.planExpires) {
            const expires = user.planExpires.getTime() - plan.days * 86_400_000;
            if (expires <= Date.now()) {
              user.plan = "free";
              user.planExpires = undefined;
            } else {
              user.planExpires = new Date(expires);
            }
            await user.save({ validateBeforeSave: false });
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("paypal webhook:", err.message);
    res.status(500).json({ success: false }); // PayPal retries on non-2xx
  }
};

// ── UPI QR (Pro plan) ────────────────────────────────────────────────────────
// UPI has no server-side callback without a payment aggregator, so this flow is
// "pay in your UPI app → submit the 12-digit UTR → an admin confirms". PayPal is
// the fully automatic path.

const enc = encodeURIComponent;

exports.createUpiPayment = async (req, res, next) => {
  try {
    const vpa = process.env.UPI_MERCHANT_VPA;
    if (!vpa) throw httpError(503, "UPI payments are not enabled on this server.");
    const plan = PLANS[req.body.plan];
    if (!plan) throw httpError(400, "Choose a valid plan.");

    const payeeName = process.env.UPI_MERCHANT_NAME || "Verifee";
    const txnRef = `VF${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const payment = await Payment.create({
      user: req.user._id,
      provider: "upi",
      kind: "pro_plan",
      plan: plan.id,
      amount: plan.inr,
      currency: "INR",
      amountInr: plan.inr,
      status: "created",
      upi: { txnRef, vpa, payeeName },
    });

    const uri =
      `upi://pay?pa=${vpa}&pn=${enc(payeeName)}&am=${plan.inr.toFixed(2)}&cu=INR` +
      `&tn=${enc(`Verifee ${plan.name}`)}&tr=${txnRef}`;

    res.status(201).json({
      success: true,
      data: { paymentId: payment._id, uri, vpa, payeeName, amountInr: plan.inr, txnRef },
    });
  } catch (err) {
    next(err);
  }
};

exports.submitUpiUtr = async (req, res, next) => {
  try {
    const utr = String(req.body.utr || "").trim();
    if (!/^\d{12}$/.test(utr)) throw httpError(400, "A UPI transaction ID (UTR) is 12 digits.");

    const payment = await Payment.findOne({ _id: req.body.paymentId, user: req.user._id, provider: "upi" });
    if (!payment) throw httpError(404, "Payment not found.");
    if (payment.status !== "created") throw httpError(409, "This payment was already submitted.");

    payment.upi.utr = utr;
    payment.status = "pending_verification";
    try {
      await payment.save();
    } catch (err) {
      if (err.code === 11000) throw httpError(409, "That transaction ID was already used.");
      throw err;
    }

    res.json({
      success: true,
      message: "Thanks. We'll confirm your UPI payment and activate Pro shortly.",
      data: { payment: serializePayment(payment) },
    });
  } catch (err) {
    next(err);
  }
};

exports.myPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: payments.map(serializePayment) });
  } catch (err) {
    next(err);
  }
};

// ── Admin: confirm UPI payments ──────────────────────────────────────────────

exports.adminPendingUpi = async (req, res, next) => {
  try {
    const items = await Payment.find({ provider: "upi", status: "pending_verification" })
      .sort({ createdAt: 1 })
      .populate("user", "name email")
      .limit(100)
      .lean();
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.adminReviewUpi = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) throw httpError(400, "action must be approve or reject");

    const payment = await Payment.findOne({ _id: req.params.id, provider: "upi", status: "pending_verification" });
    if (!payment) throw httpError(404, "No pending UPI payment with that id.");

    if (action === "reject") {
      payment.status = "rejected";
      await payment.save();
      return res.json({ success: true, data: { payment: serializePayment(payment) } });
    }

    const { payment: done } = await fulfil(payment._id);
    res.json({ success: true, data: { payment: serializePayment(done) } });
  } catch (err) {
    next(err);
  }
};