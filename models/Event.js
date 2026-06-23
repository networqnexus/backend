const mongoose = require("mongoose");
const eventSchema = new mongoose.Schema({
  host:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:         { type: String, required: true, trim: true },
  description:   { type: String, default: "" },
  category:      { type: String, enum: ["webinar","workshop","networking","hiring","conference","other"], default: "networking" },
  date:          { type: Date, required: true },
  endDate:       { type: Date },
  isOnline:      { type: Boolean, default: true },
  location:      { type: String, default: "Online" },
  link:          { type: String, default: "" },
  attendees:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  maxAttendees:  { type: Number },
  isPublic:      { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model("Event", eventSchema);
