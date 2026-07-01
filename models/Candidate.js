const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  date:         { type: String },
  time:         { type: String },
  type:         { type: String, enum: ["phone", "video", "in-person", "technical", "hr"], default: "video" },
  interviewers: [String],
  meetLink:     { type: String },
  status:       { type: String, enum: ["scheduled", "completed", "cancelled", "no-show"], default: "scheduled" },
  feedback: {
    rating:         { type: Number, min: 1, max: 5 },
    strengths:      String,
    weaknesses:     String,
    recommendation: { type: String, enum: ["strong_yes", "yes", "no", "strong_no"] },
    notes:          String,
    submittedBy:    String,
    submittedAt:    Date,
  },
  scheduledAt: { type: Date, default: Date.now },
});

const candidateSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true },
  phone:       { type: String },
  role:        { type: String, required: true },
  company:     { type: String },
  experience:  { type: String },
  skills:      [String],
  stage:       { type: String, enum: ["applied","screening","interview","offer","hired","rejected"], default: "applied" },
  rating:      { type: Number, min: 1, max: 5, default: 3 },
  resumeUrl:   { type: String },
  resumeText:  { type: String },
  notes:       { type: String },
  source:      { type: String, enum: ["manual","job_board","referral","website","linkedin","other"], default: "manual" },
  jobId:       { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organization:{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  appliedDate: { type: Date, default: Date.now },

  interviews:  [interviewSchema],

  offer: {
    salary:      String,
    position:    String,
    startDate:   String,
    department:  String,
    reportingTo: String,
    benefits:    [String],
    status:      { type: String, enum: ["draft","sent","accepted","declined","expired"], default: "draft" },
    generatedAt: Date,
    expiresAt:   Date,
  },

  approval: {
    status:          { type: String, enum: ["pending","approved","rejected"], default: "pending" },
    approvedBy:      String,
    approvedAt:      Date,
    rejectionReason: String,
  },

  statusHistory: [{
    stage:     String,
    changedAt: { type: Date, default: Date.now },
    changedBy: String,
    note:      String,
  }],

  onboarding: {
    triggered:   { type: Boolean, default: false },
    employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    triggeredAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("Candidate", candidateSchema);
