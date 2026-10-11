const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.split(" ")[1] : null;
};

exports.protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded.id ? await User.findById(decoded.id).select("-password") : null;
    if (!user || user.isActive === false)
      return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Token expired" });
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Attaches req.user when a valid token is present, but never rejects.
// Used by routes that work for guests but behave differently for members
// (free-tier quotas, AI Pay Guard).
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = decoded.id ? await User.findById(decoded.id).select("-password") : null;
      if (user && user.isActive !== false) req.user = user;
    }
  } catch {
    // invalid/expired token → treat as guest
  }
  next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: "Access denied" });
  next();
};