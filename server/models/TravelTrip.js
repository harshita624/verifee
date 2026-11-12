const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, default: "other", maxlength: 40 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  amountHome: { type: Number, min: 0 },
  homeCurrency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  merchant: { type: String, maxlength: 100 },
  note: { type: String, maxlength: 300 },
  spentAt: { type: Date, default: Date.now },
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  product: { type: String, required: true, trim: true, maxlength: 120 },
  targetPrice: { type: Number, required: true, min: 1 },
  currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const tripSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  budget: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
  homeCurrency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
  expenses: { type: [expenseSchema], default: [] },
  alerts: { type: [alertSchema], default: [] },
  startsAt: Date,
  endsAt: Date,
}, { timestamps: true });

tripSchema.index({ owner: 1, updatedAt: -1 });
module.exports = mongoose.model("TravelTrip", tripSchema);
