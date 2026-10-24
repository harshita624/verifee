const mongoose = require("mongoose");

const receiptAssetSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  filename: { type: String, required: true, maxlength: 180 },
  contentType: { type: String, enum: ["image/jpeg", "image/png", "image/webp", "application/pdf"], required: true },
  data: { type: Buffer, required: true, select: false },
  downloadToken: { type: String, select: false },
  downloadTokenExpiresAt: { type: Date, select: false },
}, { timestamps: true });

module.exports = mongoose.model("ReceiptAsset", receiptAssetSchema);
