const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  techStack:   [{ type: String, trim: true }],
  status:      { type: String, enum: ["active", "completed", "paused"], default: "active" },
  githubUrl:   { type: String, default: "" },
  liveUrl:     { type: String, default: "" },
  thumbnail:   { type: String, default: "" },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
