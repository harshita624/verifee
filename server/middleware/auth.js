const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME } = require("../config/authCookie");

const getToken = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.split(" ")[1];
  const cookie = String(req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1)); }
  catch { return null; }
};

exports.protect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded.id ? await User.findById(decoded.id).select("-password +authVersion") : null;
    if (!user || user.isActive === false)
      return res.status(401).json({ success: false, message: "User not found" });
    if ((decoded.ver || 0) !== (user.authVersion || 0))
      return res.status(401).json({ success: false, message: "Session expired. Sign in again." });

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
      const user = decoded.id ? await User.findById(decoded.id).select("-password +authVersion") : null;
      if (user && user.isActive !== false && (decoded.ver || 0) === (user.authVersion || 0)) req.user = user;
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
