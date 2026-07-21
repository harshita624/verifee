const express = require("express");
const priceController = require("../controllers/priceController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", priceController.getReports);
router.post("/", protect, priceController.createReport);
router.get("/stats/:product", priceController.getProductStats);
router.patch("/:id/helpful", protect, priceController.voteHelpful);

module.exports = router;