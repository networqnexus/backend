const User    = require("../models/User");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../config/emailService");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, contactNumber, location, username, password, role } = req.body;
    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ success: false, message: "Email already registered" });
    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ success: false, message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken    = randomBytes(32).toString("hex");
    const verifyExpiry   = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await User.create({
      name, email, contactNumber, location, username,
      password: hashedPassword,
      role: role || "candidate",
      emailVerified: false,
      emailVerificationToken: verifyToken,
      emailVerificationExpiry: verifyExpiry,
    });

    await sendVerificationEmail(email, name, verifyToken);

    res.status(201).json({ success: true, message: "Account created. Please check your email to verify." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid Credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const userData = {
      id:                  user._id.toString(),
      _id:                 user._id.toString(),
      name:                user.name,
      email:               user.email,
      username:            user.username,
      contactNumber:       user.contactNumber,
      location:            user.location,
      headline:            user.headline,
      avatarUrl:           user.avatarUrl,
      role:                user.role,
      onboardingCompleted: user.onboardingCompleted,
      emailVerified:       user.emailVerified,
    };
    res.status(200).json({ success: true, message: "Login Successful", token, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/auth/verify-email?token=xxx
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Token missing" });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired verification link" });

    user.emailVerified           = true;
    user.emailVerificationToken  = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ success: false, message: "Email already verified" });

    const verifyToken  = randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerificationToken  = verifyToken;
    user.emailVerificationExpiry = verifyExpiry;
    await user.save();

    await sendVerificationEmail(email, user.name, verifyToken);
    res.json({ success: true, message: "Verification email sent" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "If this email exists, a reset link has been sent" });

    const resetToken  = randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
    user.passwordResetToken  = resetToken;
    user.passwordResetExpiry = resetExpiry;
    await user.save();

    await sendPasswordResetEmail(email, user.name, resetToken);
    res.json({ success: true, message: "Password reset link sent to your email" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: "Token and password required" });

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired reset link" });

    user.password          = await bcrypt.hash(password, 10);
    user.passwordResetToken  = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: "Google credential missing" });

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Find existing user
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-create account for new Google users
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + Math.floor(Math.random() * 999);
      user = await User.create({
        name,
        email,
        username,
        password:      await bcrypt.hash(randomBytes(16).toString("hex"), 10),
        contactNumber: "",
        location:      "",
        avatarUrl:     picture || "",
        emailVerified: true, // Google accounts are pre-verified
        onboardingCompleted: false,
      });
    } else {
      // Mark existing user as verified if they login with Google
      if (!user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const userData = {
      id:                  user._id.toString(),
      _id:                 user._id.toString(),
      name:                user.name,
      email:               user.email,
      username:            user.username,
      contactNumber:       user.contactNumber,
      location:            user.location,
      headline:            user.headline,
      avatarUrl:           user.avatarUrl,
      role:                user.role,
      onboardingCompleted: user.onboardingCompleted,
      emailVerified:       user.emailVerified,
    };
    res.json({ success: true, message: "Login Successful", token, user: userData });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
};

// PUT /api/auth/complete-onboarding
exports.completeOnboarding = async (req, res) => {
  try {
    const { role } = req.body;
    const updateData = { onboardingCompleted: true };
    if (role) updateData.role = role;
    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
    res.status(200).json({ success: true, message: "Onboarding Completed", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -emailVerificationToken -emailVerificationExpiry -passwordResetToken -passwordResetExpiry");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: { ...user.toObject(), id: user._id.toString() } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
