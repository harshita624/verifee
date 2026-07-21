const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        avatar: user.avatar,
        city: user.city,
        contributionCount: user.contributionCount,
      },
    },
  });
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, city } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });

    if (password.length < 8)
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    if (await User.findOne({ email: email.toLowerCase().trim() }))
      return res.status(409).json({ success: false, message: "An account with this email already exists" });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      city: city?.trim() || "",
    });

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user || !user.password || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    if (!googleId || !email)
      return res.status(400).json({ success: false, message: "Google auth data required" });

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        googleId,
        email: email.toLowerCase(),
        name,
        avatar,
        isVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (avatar && !user.avatar) user.avatar = avatar;
      await user.save({ validateBeforeSave: false });
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, city, language, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (city) updates.city = city.trim();
    if (language) updates.language = language;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with that email" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // In production: send email with reset link
    // await emailService.sendPasswordReset(user.email, resetToken);

    res.json({
      success: true,
      message: "Password reset link sent to your email",
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

    if (!req.body.password || req.body.password.length < 8)
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};