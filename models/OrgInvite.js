const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  org:        { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  role:       { type: String, enum: ["employee", "hr", "admin"], default: "employee" },
  invitedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token:      { type: String, required: true, unique: true },
  status:     { type: String, enum: ["pending", "accepted", "cancelled", "expired"], default: "pending" },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
module.exports = mongoose.model("OrgInvite", schema);
