const AuditLog = require('../models/AuditLog');

module.exports = async function audit(req, { action, targetType, targetId, metadata = {} }) {
  try {
    await AuditLog.create({
      user:       req.user?._id,
      action,
      targetType,
      targetId,
      metadata,
      ip:         req.ip,
      userAgent:  req.get('user-agent'),
      createdAt:  new Date(),
    });
  } catch {
    // audit failures should never crash the main request
  }
};