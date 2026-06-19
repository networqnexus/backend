const { Employee, LeaveRequest } = require("../models/Employee");
const mongoose = require("mongoose");

exports.getEmployees = async (req, res) => {
  try {
    const { dept, search } = req.query;
    const filter = { companyId: req.user.id };
    if (dept && dept !== "All Departments") filter.department = dept;
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { role: { $regex: search, $options: "i" } }];
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, employees });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.addEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({ ...req.body, companyId: req.user.id });
    res.status(201).json({ success: true, employee });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.id },
      req.body,
      { new: true }
    );
    res.json({ success: true, employee });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.findOneAndDelete({ _id: req.params.id, companyId: req.user.id });
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ companyId: req.user.id })
      .populate("employee", "name department role avatarUrl")
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.addLeaveRequest = async (req, res) => {
  try {
    const request = await LeaveRequest.create({ ...req.body, companyId: req.user.id });
    await request.populate("employee", "name department role");
    res.status(201).json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.id },
      { status },
      { new: true }
    ).populate("employee", "name department role");
    if (!request) return res.status(404).json({ success: false, message: "Not found" });
    if (status === "approved") {
      await Employee.findByIdAndUpdate(request.employee._id, { $inc: { leaveBalance: -request.days } });
    }
    res.json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getStats = async (req, res) => {
  try {
    const companyId = req.user.id;
    const total = await Employee.countDocuments({ companyId });
    const onLeave = await Employee.countDocuments({ companyId, status: "on_leave" });
    const pending = await LeaveRequest.countDocuments({ companyId, status: "pending" });
    const employees = await Employee.find({ companyId });
    const totalPayroll = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    res.json({ success: true, stats: { total, onLeave, pending, totalPayroll } });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
