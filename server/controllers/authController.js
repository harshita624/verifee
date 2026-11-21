const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { TRAVEL_FREQUENCY } = require("../models/User");
const { sendPasswordResetEmail } = require("../services/emailService");
const { COOKIE_NAME, cookieOptions } = require("../config/authCookie");

const signToken = (user) =>
  jwt.sign({ id: user._id, ver: user.authVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// FIX: previously returned a hand-built object with `id` while GET /me returns
// `_id`, so the same user had two shapes (the leaderboard "You" highlight and
// other `_id` comparisons failed right after login). Both now use toJSON().
const sendToken = (user, statusCode, req, res) => {
  const token = signToken(user);
  const cookieSession = req.get("X-Auth-Transport") === "cookie";
  if (cookieSession) res.cookie(COOKIE_NAME, token, cookieOptions());
  res.status(statusCode).json({
    success: true,
    data: { ...(cookieSession ? {} : { token }), user: user.toJSON() },
  });
};

const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
const invalidPassword = (value) =>
  typeof value !== "string" || Buffer.byteLength(value, "utf8") < 8 || Buffer.byteLength(value, "utf8") > 72;

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, city } = req.body;

    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string")
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });

    if (invalidPassword(password))
      return res.status(400).json({ success: false, message: "Password must be 8 to 72 UTF-8 bytes long" });

    if (await User.findOne({ email: email.toLowerCase().trim() }))
      return res.status(409).json({ success: false, message: "An account with this email already exists" });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      city: city?.trim() || "",
    });

    sendToken(user, 201, req, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password)
      return res.status(400).json({ success: false, message: "Email and password are required" });
    if (Buffer.byteLength(password, "utf8") > 72)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password +authVersion");

    if (!user || !user.password || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (user.isActive === false)
      return res.status(403).json({ success: false, message: "This account has been disabled" });

    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

// SECURITY FIX: the old version trusted a client-supplied { googleId, email }
// body, so anyone could sign in as any user by posting their email address.
// We now verify a real Google ID token (audience-checked) before trusting it.
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ success: false, message: "Google ID token required" });
    if (!process.env.GOOGLE_CLIENT_ID)
      return res.status(503).json({ success: false, message: "Google sign-in is not configured" });

    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!r.ok) return res.status(401).json({ success: false, message: "Invalid Google token" });

    const info = await r.json();
    const verified = info.email_verified === true || info.email_verified === "true";
    if (info.aud !== process.env.GOOGLE_CLIENT_ID || !verified || !info.email || typeof info.sub !== "string" || !info.sub)
      return res.status(401).json({ success: false, message: "Google account could not be verified" });

    const googleId = info.sub;
    const email = String(info.email).toLowerCase();

    // Resolve Google identity first. Never auto-link a Google identity to a
    // password account by email: local accounts are not email-verified, so a
    // pre-registered address could otherwise become an account takeover.
    let user = await User.findOne({ googleId }).select("+authVersion");

    if (!user) {
      const emailUser = await User.findOne({ email }).select("+password +authVersion");
      if (emailUser?.password) {
        return res.status(409).json({
          success: false,
          message: "An account already uses this email. Sign in with your password instead.",
        });
      }
      user = emailUser;
    }

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name: info.name || email.split("@")[0],
        avatar: info.picture,
        isVerified: true,
      });
    } else {
      if (user.isActive === false)
        return res.status(403).json({ success: false, message: "This account has been disabled" });
      if (user.googleId && user.googleId !== googleId)
        return res.status(409).json({ success: false, message: "This email is already linked to another Google account." });
      let dirty = false;
      if (!user.googleId) { user.googleId = googleId; dirty = true; }
      if (!user.isVerified) { user.isVerified = true; dirty = true; }
      if (info.picture && !user.avatar) { user.avatar = info.picture; dirty = true; }
      if (dirty) await user.save({ validateBeforeSave: false });
    }

    sendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

const str = (v, max) => String(v).trim().slice(0, max);

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, city, country, language, bio, travelFrequency, avatar } = req.body;
    const updates = {};

    if (name !== undefined) {
      const n = str(name, 60);
      if (!n) return res.status(400).json({ success: false, message: "Name can't be empty" });
      updates.name = n;
    }
    if (phone !== undefined) updates.phone = str(phone, 20);
    if (city !== undefined) updates.city = str(city, 60);
    if (country !== undefined) updates.country = str(country, 60);
    if (language !== undefined) updates.language = str(language, 30);
    if (bio !== undefined) updates.bio = str(bio, 300);
    if (travelFrequency !== undefined) {
      if (!TRAVEL_FREQUENCY.includes(travelFrequency))
        return res.status(400).json({ success: false, message: "Invalid travel frequency" });
      updates.travelFrequency = travelFrequency;
    }
    if (avatar !== undefined) {
      // Only plain http(s) URLs; never store giant base64 blobs in the user doc.
      if (avatar && !/^https?:\/\/\S{1,490}$/i.test(avatar))
        return res.status(400).json({ success: false, message: "Avatar must be an http(s) URL" });
      updates.avatar = avatar || null;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// FIX: used to answer 404 for unknown emails (account enumeration) and never
// actually sent an email, so the feature was a dead end. Always answers the
// same way, and emails a link to /auth/reset/<token>.
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const message = "If an account exists for that email, a reset link has been sent.";
    const user = await User.findOne({ email });
    let resetToken;

    if (user) {
      resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      await user.save({ validateBeforeSave: false });

      try {
        await sendPasswordResetEmail(user.email, `${frontendUrl()}/auth/reset/${resetToken}`);
      } catch (err) {
        console.error("password reset email failed:", err.message);
      }
    }

    res.json({
      success: true,
      message,
      ...(process.env.NODE_ENV === "development" && resetToken && { resetToken }),
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    if (invalidPassword(req.body.password))
      return res.status(400).json({ success: false, message: "Password must be 8 to 72 UTF-8 bytes long" });

    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+authVersion");

    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired reset link" });

    user.password = req.body.password;
    user.authVersion = (user.authVersion || 0) + 1;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user) await User.updateOne({ _id: req.user._id }, { $inc: { authVersion: 1 } });
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// FIX: this handler lived in routes/auth.js but that file never imported User,
// so every call threw "ReferenceError: User is not defined".
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    if (invalidPassword(newPassword))
      return res.status(400).json({ success: false, message: "New password must be 8 to 72 UTF-8 bytes long" });
    if (currentPassword === newPassword)
      return res.status(400).json({ success: false, message: "New password must be different from current password" });

    const user = await User.findById(req.user._id).select("+password +authVersion");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.password)
      return res.status(400).json({ success: false, message: "Your account uses Google sign-in. Password cannot be changed here." });

    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = newPassword;
    user.authVersion = (user.authVersion || 0) + 1;
    await user.save();

    sendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

const shortName = (name = "") => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first || "Anonymous";
};

// FIX: filtered on a non-existent `isActive` field (always empty) and exposed
// full names. Now matches users without the flag and shows "First L.".
exports.topContributors = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const leaders = await User.find({ contributionCount: { $gt: 0 }, isActive: { $ne: false } })
      .select("name city xp contributionCount level")
      .sort({ xp: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: leaders.map((u) => ({ ...u, name: shortName(u.name) })),
    });
  } catch (err) {
    next(err);
  }
};
