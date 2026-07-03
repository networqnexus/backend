const User = require("../models/User");

// Whether a user allows a given notification type (default true if unset)
exports.notifAllowed = async (userId, prefKey) => {
  const user = await User.findById(userId).select("notificationPreferences");
  return user?.notificationPreferences?.[prefKey] !== false;
};
