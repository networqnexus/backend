const express = require("express");
const router  = express.Router();
const c       = require("../controllers/authController");
const auth    = require("../middleware/authMiddleware");

router.post("/google",               c.googleAuth);
router.post("/signup",               c.signup);
router.post("/login",                c.login);
router.get("/verify-email",          c.verifyEmail);
router.post("/resend-verification",  c.resendVerification);
router.post("/forgot-password",      c.forgotPassword);
router.post("/reset-password",       c.resetPassword);
router.put("/complete-onboarding",   auth, c.completeOnboarding);
router.get("/me",                    auth, c.getMe);

module.exports = router;
