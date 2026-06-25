const mongoose = require("mongoose");
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
  notes:       { type: String },
  jobId:       { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organization:{ type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  appliedDate: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model("Candidate", candidateSchema);
