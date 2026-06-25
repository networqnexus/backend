const Lead = require("../models/Lead");

exports.getLeads = async (req, res) => {
  try {
    const { stage, search } = req.query;
    const filter = req.org ? { organization: req.org._id } : { owner: req.user.id };
    if (stage && stage !== "all") filter.stage = stage;
    if (search) filter.$or = [{ companyName: { $regex: search, $options: "i" } }, { contactName: { $regex: search, $options: "i" } }];
    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.addLead = async (req, res) => {
  try {
    const extra = req.org ? { organization: req.org._id } : { owner: req.user.id };
    const lead = await Lead.create({ ...req.body, ...extra });
    res.status(201).json({ success: true, lead });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      req.org ? { _id: req.params.id, organization: req.org._id } : { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, lead });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteLead = async (req, res) => {
  try {
    await Lead.findOneAndDelete(req.org ? { _id: req.params.id, organization: req.org._id } : { _id: req.params.id, owner: req.user.id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getStats = async (req, res) => {
  try {
    const leads = await Lead.find(req.org ? { organization: req.org._id } : { owner: req.user.id });
    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
    const wonValue = leads.filter(l => l.stage === "closed_won").reduce((sum, l) => sum + (l.value || 0), 0);
    const activeLeads = leads.filter(l => !["closed_won","closed_lost"].includes(l.stage)).length;
    const avgProbability = leads.length ? Math.round(leads.reduce((s, l) => s + l.probability, 0) / leads.length) : 0;
    res.json({ success: true, stats: { totalValue, wonValue, activeLeads, avgProbability, total: leads.length } });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
