const express = require("express");
const c = require("../controllers/paymentController");
const { protect, optionalAuth, restrictTo } = require("../middleware/auth");
const { planGate } = require("../middleware/planGate");

const router = express.Router();

// Public
router.get("/config", c.getConfig);

// AI Pay Guard — works for guests too; free users get a daily quota, Pro is unlimited.
router.post("/guard", optionalAuth, planGate("premium"), c.guard);

// PayPal
router.post("/paypal/create-order", protect, c.createPaypalOrder);
router.post("/paypal/capture-order", protect, c.capturePaypalOrder);
router.post("/paypal/cancel-order", protect, c.cancelPaypalOrder);
router.post("/paypal/webhook", c.webhook); // signature-verified inside

// UPI QR
router.post("/upi/create", protect, c.createUpiPayment);
router.post("/upi/submit", protect, c.submitUpiUtr);

// History
router.get("/mine", protect, c.myPayments);

// Admin: confirm UPI payments
router.get("/admin/upi/pending", protect, restrictTo("admin"), c.adminPendingUpi);
router.patch("/admin/upi/:id", protect, restrictTo("admin"), c.adminReviewUpi);
router.get("/admin/insights", protect, restrictTo("admin"), c.adminInsights);

module.exports = router;