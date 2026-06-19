const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, default: "" },
  category:        { type: String, default: "General" },
  host:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roomName:        { type: String, unique: true, sparse: true },
  status:          { type: String, enum: ["scheduled", "live", "ended"], default: "live" },
  isPublic:        { type: Boolean, default: true },
  invitedUsers:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  scheduledAt:     { type: Date },
  viewerCount:     { type: Number, default: 0 },
  peakViewerCount: { type: Number, default: 0 },
  startedAt:       { type: Date },
  endedAt:         Date,
}, { timestamps: true });

module.exports = mongoose.model("Stream", streamSchema);
