const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const User = require("../models/User");
const { Employee } = require("../models/Employee");

const STAGE_ORDER = ["applied", "screening", "interview", "offer", "hired"];

const ownerFilter = (req) =>
  req.org ? { organization: req.org._id } : { postedBy: req.user.id };

const ownerFilterAgg = (req) =>
  req.org
    ? { organization: req.org._id }
    : { postedBy: new mongoose.Types.ObjectId(req.user.id) };

// Job postings are scoped the same way as candidates: by organization when in an org
// workspace, otherwise by the individual recruiter who posted them.
const jobOwnerFilter = (req) =>
  req.org ? { organization: req.org._id } : { postedBy: req.user.id };

// ── List ──────────────────────────────────────────────────────────────────────
exports.getCandidates = async (req, res) => {
  try {
    const { stage, search, source } = req.query;
    const filter = ownerFilter(req);
    if (stage && stage !== "all") filter.stage = stage;
    if (source && source !== "all") filter.source = source;
    if (search)
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { role:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, candidates });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Single ────────────────────────────────────────────────────────────────────
exports.getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, ...ownerFilter(req) });
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Create ────────────────────────────────────────────────────────────────────
exports.addCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.create({ ...req.body, ...ownerFilter(req) });
    res.status(201).json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Stage ─────────────────────────────────────────────────────────────────────
exports.updateStage = async (req, res) => {
  try {
    const { stage, note } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { stage, $push: { statusHistory: { stage, note, changedBy: req.user.id } } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Rating ────────────────────────────────────────────────────────────────────
exports.updateRating = async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { rating: req.body.rating },
      { new: true }
    );
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Notes ─────────────────────────────────────────────────────────────────────
exports.updateNotes = async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { notes: req.body.notes },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Delete ────────────────────────────────────────────────────────────────────
exports.deleteCandidate = async (req, res) => {
  try {
    await Candidate.findOneAndDelete({ _id: req.params.id, ...ownerFilter(req) });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Stats (dashboard cards) ───────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const match = ownerFilterAgg(req);
    const [total, byStage, bySource] = await Promise.all([
      Candidate.countDocuments(ownerFilter(req)),
      Candidate.aggregate([{ $match: match }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
      Candidate.aggregate([{ $match: match }, { $group: { _id: "$source", count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, total, byStage, bySource });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Interview: schedule ───────────────────────────────────────────────────────
exports.scheduleInterview = async (req, res) => {
  try {
    const { date, time, type, interviewers, meetLink } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { $push: { interviews: { date, time, type, interviewers, meetLink } } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Interview: update status ──────────────────────────────────────────────────
exports.updateInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, "interviews._id": req.params.interviewId, ...ownerFilter(req) },
      { $set: { "interviews.$.status": req.body.status } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Interview: submit feedback ────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, strengths, weaknesses, recommendation, notes } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, "interviews._id": req.params.interviewId, ...ownerFilter(req) },
      {
        $set: {
          "interviews.$.feedback": {
            rating, strengths, weaknesses, recommendation, notes,
            submittedBy: req.user.id,
            submittedAt: new Date(),
          },
          "interviews.$.status": "completed",
        },
      },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Offer letter ──────────────────────────────────────────────────────────────
exports.updateOffer = async (req, res) => {
  try {
    const { salary, position, startDate, department, reportingTo, benefits, status, expiresAt } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { offer: { salary, position, startDate, department, reportingTo, benefits, status: status || "draft", generatedAt: new Date(), expiresAt } },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Hiring approval ───────────────────────────────────────────────────────────
exports.updateApproval = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const update = {
      "approval.status": status,
      "approval.approvedBy": req.user.id,
      "approval.approvedAt": new Date(),
    };
    if (rejectionReason) update["approval.rejectionReason"] = rejectionReason;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      update,
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Onboarding: create Employee record ───────────────────────────────────────
exports.triggerOnboarding = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, ...ownerFilter(req) });
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    if (candidate.onboarding?.triggered)
      return res.status(400).json({ success: false, message: "Onboarding already triggered" });

    const { department, salary, joinDate } = req.body;
    const employeeData = {
      name:       candidate.name,
      email:      candidate.email,
      phone:      candidate.phone,
      role:       candidate.role,
      department: department || candidate.offer?.department || "General",
      salary:     salary ? Number(salary) : (candidate.offer?.salary ? parseInt(candidate.offer.salary) : 0),
      joinDate:   joinDate ? new Date(joinDate) : new Date(),
      status:     "active",
    };
    if (req.org) employeeData.organization = req.org._id;
    else employeeData.companyId = req.user.id;

    const employee = await Employee.create(employeeData);

    await Candidate.findByIdAndUpdate(candidate._id, {
      stage: "hired",
      "onboarding.triggered":   true,
      "onboarding.employeeId":  employee._id,
      "onboarding.triggeredAt": new Date(),
      $push: { statusHistory: { stage: "hired", note: "Employee record created via onboarding", changedBy: req.user.id } },
    });

    const updated = await Candidate.findById(candidate._id);
    res.json({ success: true, employee, candidate: updated });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Compliance report ─────────────────────────────────────────────────────────
exports.getReport = async (req, res) => {
  try {
    const filter = ownerFilter(req);
    const match  = ownerFilterAgg(req);

    const { from, to, ownerId } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);
    if (Object.keys(dateFilter).length) { filter.appliedDate = dateFilter; match.appliedDate = dateFilter; }
    if (ownerId) { filter.postedBy = ownerId; match.postedBy = new mongoose.Types.ObjectId(ownerId); }

    const [
      total, byStage, bySourceRaw, avgRatingArr, hiredCandidates,
      recruiterIds, jobsBreakdown, movedInto, timeseries, interviewAgg,
      activeJobsCount, totalJobsCount,
    ] = await Promise.all([
      Candidate.countDocuments(filter),
      Candidate.aggregate([{ $match: match }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
      Candidate.aggregate([{ $match: match }, { $group: {
        _id: "$source", count: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ["$stage", "hired"] }, 1, 0] } },
      } }]),
      Candidate.aggregate([{ $match: match }, { $group: { _id: null, avg: { $avg: "$rating" } } }]),
      Candidate.find({ ...filter, stage: "hired" }).select("appliedDate updatedAt"),
      Candidate.distinct("postedBy", match),
      Candidate.aggregate([
        { $match: match },
        { $group: {
          _id: { jobId: "$jobId", role: "$role" },
          total: { $sum: 1 },
          hired: { $sum: { $cond: [{ $eq: ["$stage", "hired"] }, 1, 0] } },
          avgRating: { $avg: "$rating" },
        } },
        { $lookup: { from: "jobs", localField: "_id.jobId", foreignField: "_id", as: "job" } },
        { $sort: { total: -1 } },
        { $limit: 20 },
      ]),
      Candidate.aggregate([
        { $match: match },
        { $unwind: "$statusHistory" },
        ...(Object.keys(dateFilter).length ? [{ $match: { "statusHistory.changedAt": dateFilter } }] : []),
        { $group: { _id: "$statusHistory.stage", count: { $sum: 1 } } },
      ]),
      Candidate.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
      Candidate.aggregate([{ $match: match }, { $unwind: "$interviews" }, { $count: "count" }]),
      Job.countDocuments({ ...jobOwnerFilter(req), active: true }),
      Job.countDocuments(jobOwnerFilter(req)),
    ]);

    const hired    = byStage.find(s => s._id === "hired")?.count    || 0;
    const rejected = byStage.find(s => s._id === "rejected")?.count || 0;
    const avgTimeToHire = hiredCandidates.length
      ? Math.round(hiredCandidates.reduce((acc, c) =>
          acc + (new Date(c.updatedAt) - new Date(c.appliedDate)), 0
        ) / hiredCandidates.length / 86400000)
      : 0;

    // Source quality: conversion rate + avg time-to-hire per source
    const bySource = bySourceRaw.map(s => ({
      _id: s._id, count: s.count, hired: s.hired,
      conversionRate: s.count ? Math.round((s.hired / s.count) * 100) : 0,
    }));

    // Funnel: stage-over-stage conversion following the natural pipeline order
    const stageCounts = STAGE_ORDER.map(id => byStage.find(s => s._id === id)?.count || 0);
    const funnelSteps = STAGE_ORDER.map((id, i) => ({
      stage: id,
      count: stageCounts[i],
      conversionFromPrev: i === 0 ? 100 : (stageCounts[i - 1] ? Math.round((stageCounts[i] / stageCounts[i - 1]) * 100) : 0),
    }));

    // Jobs breakdown (grouped by linked job, falling back to role name for unlinked candidates)
    const jobs = jobsBreakdown.map(j => {
      const job = j.job?.[0];
      return {
        jobId: j._id.jobId || null,
        title: job?.title || j._id.role,
        company: job?.company || null,
        active: job ? job.active : null,
        candidatesCount: j.total,
        hiredCount: j.hired,
        avgRating: Math.round((j.avgRating || 0) * 10) / 10,
      };
    });

    const recruiters = recruiterIds.length
      ? await User.find({ _id: { $in: recruiterIds } }).select("name").lean()
      : [];

    res.json({
      success: true,
      report: {
        total, byStage, bySource, hired, rejected,
        avgRating: Math.round((avgRatingArr[0]?.avg || 0) * 10) / 10,
        offerAcceptanceRate: total ? Math.round((hired / total) * 100) : 0,
        avgTimeToHire,
      },
      pipeline: { byStage, movedInto },
      source:   { bySource },
      funnel:   { steps: funnelSteps },
      jobs,
      usage: {
        timeseries,
        interviewsScheduled: interviewAgg[0]?.count || 0,
        activeRecruiters: recruiterIds.filter(Boolean).length,
        activeJobs: activeJobsCount,
        totalJobs: totalJobsCount,
        jobSlotUtilization: totalJobsCount ? Math.round((activeJobsCount / totalJobsCount) * 100) : 0,
      },
      recruiters,
    });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Hiring Assistant: skill-match suggestions per open job ────────────────────
exports.getHiringAssistant = async (req, res) => {
  try {
    const jobs = await Job.find({ ...jobOwnerFilter(req), active: true })
      .select("title company skills").limit(20).lean();

    if (!jobs.length) return res.json({ success: true, suggestions: [] });

    const candidates = await Candidate.find({ ...ownerFilter(req), stage: { $nin: ["hired", "rejected"] } })
      .select("name role skills rating stage").lean();

    const suggestions = jobs.map(job => {
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());
      const candidatesRanked = candidates
        .map(c => {
          const candSkills = (c.skills || []).map(s => s.toLowerCase());
          const matchedSkills = jobSkills.filter(s => candSkills.includes(s));
          const matchScore = jobSkills.length ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0;
          return { _id: c._id, name: c.name, role: c.role, rating: c.rating, stage: c.stage, matchScore, matchedSkills };
        })
        .filter(c => c.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
      return { job: { _id: job._id, title: job.title, company: job.company, skills: job.skills }, candidates: candidatesRanked };
    }).filter(s => s.candidates.length > 0);

    res.json({ success: true, suggestions });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Org Workspace: Job postings ────────────────────────────────────────────────
exports.getOrgJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ organization: req.org._id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.createOrgJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, organization: req.org._id, postedBy: req.user.id });
    res.status(201).json({ success: true, job });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.toggleOrgJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, organization: req.org._id });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    job.active = !job.active;
    await job.save();
    res.json({ success: true, active: job.active });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteOrgJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, organization: req.org._id });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Resume text parsing ───────────────────────────────────────────────────────
exports.parseResume = async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ success: false, message: "Resume text required" });

    const emailMatch = resumeText.match(/[\w.+\-]+@[\w\-]+\.\w+/);
    const phoneMatch = resumeText.match(/(\+?\d[\d\s\-.()]{7,14}\d)/);
    const expMatch   = resumeText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);

    const TECH = [
      "JavaScript","TypeScript","React","Node.js","Python","Java","Go","SQL","MongoDB",
      "PostgreSQL","Docker","Kubernetes","AWS","GCP","Azure","GraphQL","REST","Git",
      "Vue","Angular","Next.js","Express","Django","Flask","Spring","PHP","Ruby",
      "Swift","Kotlin","C++","C#","Rust","Redis","Elasticsearch","Kafka","Terraform",
      "Linux","Tailwind","Figma","Jira","Agile","Scrum","CI/CD","HTML","CSS",
    ];
    const skills = TECH.filter(kw => new RegExp(`\\b${kw.replace(".", "\\.")}\\b`, "i").test(resumeText));

    res.json({
      success: true,
      parsed: {
        email:      emailMatch?.[0] || "",
        phone:      phoneMatch?.[0]?.trim() || "",
        experience: expMatch ? `${expMatch[1]} yrs` : "",
        skills,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
