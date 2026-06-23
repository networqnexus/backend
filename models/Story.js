const mongoose = require("mongoose");
const storySchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  caption:   { type: String, default: "" },
  media:     { data: String, mimeType: String, type: { type: String, enum: ["image","video"] } },
  bgColor:   { type: String, default: "from-violet-500 to-pink-500" },
  viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) },
}, { timestamps: true });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("Story", storySchema);
