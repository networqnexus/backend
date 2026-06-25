const mongoose = require("mongoose");
const leadSchema = new mongoose.Schema({
  companyName:   { type: String, required: true },
  contactName:   { type: String, required: true },
  contactEmail:  { type: String },
  contactPhone:  { type: String },
  value:         { type: Number, default: 0 },
  currency:      { type: String, default: "INR" },
  stage:         { type: String, enum: ["prospect","qualified","proposal","negotiation","closed_won","closed_lost"], default: "prospect" },
  probability:   { type: Number, default: 20 },
  priority:      { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
  notes:         { type: String },
  lastContact:   { type: Date, default: Date.now },
  expectedClose: { type: Date },
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organization:  { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  activities:    [{ type: String, text: String, date: { type: Date, default: Date.now } }],
}, { timestamps: true });
module.exports = mongoose.model("Lead", leadSchema);
