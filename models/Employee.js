const mongoose = require("mongoose");
const employeeSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  phone:         { type: String },
  department:    { type: String, required: true },
  role:          { type: String, required: true },
  salary:        { type: Number, required: true },
  status:        { type: String, enum: ["active","on_leave","inactive"], default: "active" },
  joinDate:      { type: Date, default: Date.now },
  leaveBalance:  { type: Number, default: 20 },
  avatarUrl:     { type: String },
  manager:       { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  companyId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const leaveRequestSchema = new mongoose.Schema({
  employee:    { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  type:        { type: String, enum: ["annual","sick","wfh","maternity","paternity","other"], required: true },
  fromDate:    { type: Date, required: true },
  toDate:      { type: Date, required: true },
  days:        { type: Number, required: true },
  reason:      { type: String },
  status:      { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = {
  Employee: mongoose.model("Employee", employeeSchema),
  LeaveRequest: mongoose.model("LeaveRequest", leaveRequestSchema),
};
