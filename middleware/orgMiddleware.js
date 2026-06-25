const Organization = require("../models/Organization");

module.exports = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    const isOwner = org.owner.toString() === req.user.id;
    const isAdmin = org.admins.some(a => a.toString() === req.user.id);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: "Access denied. You are not a member of this organization." });
    req.org = org;
    next();
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
