const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.googleAuth);
router.get("/me", protect, authController.getMe);
router.patch("/me", protect, authController.updateProfile);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/change-password", protect, authController.changePassword);
router.get("/top-contributors", authController.topContributors);

module.exports = router;