const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  text: { type: String, default: "" },
  media: {
    data: String, mimeType: String, filename: String, size: Number,
    type: { type: String, enum: ["image", "video", "document"] },
  },
  read: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // group messages only
}, { timestamps: true });
module.exports = mongoose.model("Message", messageSchema);
