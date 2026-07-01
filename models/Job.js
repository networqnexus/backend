const mongoose = require("mongoose");
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ["Remote", "Hybrid", "On-site"], required: true },
  level: { type: String, enum: ["Junior", "Mid", "Senior", "Lead"], required: true },
  employmentType: { type: String, enum: ["Full-time", "Part-time", "Contract", "Internship", "Temporary"], default: "Full-time" },
  salary: String, skills: [String], description: String, requirements: [String], perks: [String],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  applicants: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resumeUrl: { type: String },
    coverNote: { type: String },
       status:    { type: String, enum: ["pending","reviewed","shortlisted","rejected"], default: "pending" },
    appliedAt: { type: Date, default: Date.now },
    interview: {
      date:        { type: String },
      time:        { type: String },
      meetLink:    { type: String },
      scheduledAt: { type: Date },
    },


  }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model("Job", jobSchema);
