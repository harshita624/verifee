const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true },
  description: { type: String },
  city:        { type: String },
  state:       { type: String },
  priceMin:    { type: Number },
  priceMax:    { type: Number },
  priceAvg:    { type: Number },
  currency:    { type: String, default: 'INR' },
  tags:        [{ type: String }],
  images:      [{ type: String }],
  sourceType:  { type: String, enum: ['community', 'ai', 'admin'], default: 'ai' },
  confidence:  { type: Number, default: 0 },
  viewCount:   { type: Number, default: 0 },
  savedBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

productSchema.index({ name: 'text', category: 1, city: 1 });

module.exports = mongoose.model('Product', productSchema);