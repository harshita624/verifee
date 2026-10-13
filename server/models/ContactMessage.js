const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 80 },
  email:     { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  topic:     { type: String, default: "General" },
  message:   { type: String, required: true, maxlength: 3000 },
  ip:        String,
  userAgent: String,
  resolved:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);