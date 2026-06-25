const mongoose = require("mongoose");

const orgSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  tagline:     { type: String, default: "" },
  description: { type: String, default: "" },
  industry:    { type: String, default: "" },
  website:     { type: String, default: "" },
  logoUrl:     { type: String, default: "" },
  coverUrl:    { type: String, default: "" },
  location:    { type: String, default: "" },
  size:        { type: String, enum: ["1-10","11-50","51-200","201-500","501-1000","1000+"], default: "1-10" },
  foundedYear: { type: Number },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  admins:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  verified:    { type: Boolean, default: false },
}, { timestamps: true });

orgSchema.index({ name: "text", tagline: "text", industry: "text" });
module.exports = mongoose.model("Organization", orgSchema);
