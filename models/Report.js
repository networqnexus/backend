const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  post:     { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason:   { type: String, default: "" },
  status:   { type: String, enum: ["pending", "reviewed"], default: "pending" },
}, { timestamps: true });

reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
