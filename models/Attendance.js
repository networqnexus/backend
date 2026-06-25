const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: "Employee",     required: true },
  date:         { type: String, required: true },  // "YYYY-MM-DD"
  status:       { type: String, enum: ["present","absent","late","half-day"], default: "present" },
  checkIn:      { type: String, default: "" },
  checkOut:     { type: String, default: "" },
  note:         { type: String, default: "" },
}, { timestamps: true });

schema.index({ organization: 1, date: 1 });
schema.index({ organization: 1, employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", schema);
