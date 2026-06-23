const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("isPremium premiumExpiresAt");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    // If premium expired, reset the flag
    if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt < new Date()) {
      user.isPremium = false;
      await user.save();
    }

    if (!user.isPremium) {
      return res.status(403).json({
        success: false,
        message: "Premium subscription required to access this feature.",
        requiresPremium: true,
      });
    }

    next();
  } catch (e) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
