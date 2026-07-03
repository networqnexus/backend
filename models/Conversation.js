const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  isGroup:      { type: Boolean, default: true },
  name:         { type: String, required: true, trim: true, maxlength: 100 },
  avatarUrl:    { type: String, default: "" },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);
