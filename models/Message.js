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
  // Present only on system messages logging a finished voice/video call — created server-side, never by a user directly.
  // default: undefined stops Mongoose from auto-vivifying this nested object on every message (it otherwise
  // instantiates single nested subdocs eagerly because `duration` has a default), which made every plain
  // text message carry a truthy callInfo and render as a call bubble on the frontend.
  callInfo: {
    type: {
      isVideo: Boolean,
      status: { type: String, enum: ["answered", "missed", "declined"] },
      duration: { type: Number, default: 0 }, // seconds, only meaningful when status === "answered"
      caller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    default: undefined,
  },
  read: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // group messages only
}, { timestamps: true });
module.exports = mongoose.model("Message", messageSchema);
