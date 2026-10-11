const express = require("express");

const {
    protect,
    optionalAuth,
    restrictTo
} = require("../middleware/auth");

const { planGate } = require("../middleware/planGate");

const c = require("../controllers/paymentController");

const router = express.Router();

router.get("/config", c.getConfig);

router.post(
    "/guard",
    optionalAuth,
    planGate("premium"),
    c.guard
);

router.post(
    "/paypal/create-order",
    protect,
    c.createPaypalOrder
);

router.post(
    "/paypal/capture-order",
    protect,
    c.capturePaypalOrder
);

router.post(
    "/paypal/webhook",
    c.webhook
);

router.post(
    "/upi/create",
    protect,
    c.createUpiPayment
);

router.post(
    "/upi/submit",
    protect,
    c.submitUpiUtr
);

router.get(
    "/min",
    protect,
    c.myPayments
);

router.get(
    "/admin/upi/pending",
    protect,
    restrictTo("admin"),
    c.adminPendingUpi
);

router.patch(
    "/admin/upi/:id",
    protect,
    restrictTo("admin"),
    c.adminReviewUpi
);

module.exports = router;