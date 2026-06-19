const Candidate = require("../models/Candidate");

exports.getCandidates = async (req, res) => {
  try {
    const { stage, search } = req.query;
    const filter = { postedBy: req.user.id };
    if (stage && stage !== "all") filter.stage = stage;
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { role: { $regex: search, $options: "i" } }];
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, candidates });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.addCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.create({ ...req.body, postedBy: req.user.id });
    res.status(201).json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateStage = async (req, res) => {
  try {
    const { stage } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user.id },
      { stage },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateRating = async (req, res) => {
  try {
    const { rating } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user.id },
      { rating },
      { new: true }
    );
    res.json({ success: true, candidate });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteCandidate = async (req, res) => {
  try {
    await Candidate.findOneAndDelete({ _id: req.params.id, postedBy: req.user.id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Candidate.countDocuments({ postedBy: req.user.id });
    const byStage = await Candidate.aggregate([
      { $match: { postedBy: req.user._id || req.user.id } },
      { $group: { _id: "$stage", count: { $sum: 1 } } }
    ]);
    res.json({ success: true, total, byStage });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
