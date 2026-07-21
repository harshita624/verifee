const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:     { type: String, required: true },
  targetType: { type: String },
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  metadata:   { type: Object, default: {} },
  ip:         { type: String },
  userAgent:  { type: String },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);