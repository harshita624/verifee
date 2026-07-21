const express = require("express");
const shopController = require("../controllers/shopController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", shopController.getShops);
router.get("/trusted", shopController.getTrustedShops);
router.get("/:id", shopController.getShopById);
router.post("/", protect, shopController.createShop);

module.exports = router;