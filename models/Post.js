const mongoose = require("mongoose");
const commentSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, text: { type: String, required: true } }, { timestamps: true });
const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 1300 },
  media: { data: String, mimeType: String, type: { type: String, enum: ["image", "video"] } },
  tags: [String],
  visibility: { type: String, enum: ["public", "connections", "private"], default: "public" },
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, type: { type: String, default: "like" } }],
  comments: [commentSchema],
  shares: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model("Post", postSchema);
