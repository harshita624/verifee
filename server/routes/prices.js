const express = require("express");
const multer = require("multer");
const priceController = require("../controllers/priceController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    callback(allowed.includes(file.mimetype) ? null : new Error("Upload a JPG, PNG, WebP, or PDF receipt"), allowed.includes(file.mimetype));
  },
});
const parseReceiptUpload = (req, res, next) => receiptUpload.single("receipt")(req, res, (err) => {
  if (!err) return next();
  const message = err.code === "LIMIT_FILE_SIZE"
    ? "Receipt files must be 8 MB or smaller"
    : err.message || "Could not read the receipt file";
  return res.status(400).json({ success: false, message });
});

router.get("/receipt-asset/:id", priceController.downloadReceipt);
router.get("/admin/pending", protect, restrictTo("admin"), priceController.getPendingReports);
router.get("/admin/receipt-asset/:id", protect, restrictTo("admin"), priceController.downloadAdminReceipt);
router.patch("/admin/:id/review", protect, restrictTo("admin"), priceController.reviewReport);
router.get("/mine", protect, priceController.getMyReports);
router.post("/receipt", protect, parseReceiptUpload, priceController.uploadReceipt);
router.get("/", priceController.getReports);
router.post("/", protect, priceController.createReport);
router.get("/stats/:product", priceController.getProductStats);
router.patch("/:id/helpful", protect, priceController.voteHelpful);

module.exports = router;
