const Attendance  = require("../models/Attendance");
const { Employee } = require("../models/Employee");

// GET /:orgId/attendance?date=YYYY-MM-DD
exports.getAttendance = async (req, res) => {
  try {
    const date  = req.query.date || new Date().toISOString().slice(0, 10);
    const orgId = req.org._id;

    const employees   = await Employee.find({ organization: orgId, status: { $ne: "terminated" } }).sort({ department: 1, name: 1 });
    const records     = await Attendance.find({ organization: orgId, date });

    const recordMap = {};
    records.forEach(r => { recordMap[r.employee.toString()] = r; });

    const data = employees.map(e => ({
      employee: { _id: e._id, name: e.name, role: e.role, department: e.department, avatarUrl: e.avatarUrl || "" },
      record:   recordMap[e._id.toString()] || null,
    }));

    res.json({ success: true, date, data });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// POST /:orgId/attendance — mark or update single record
exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, note } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { organization: req.org._id, employee: employeeId, date },
      { status, checkIn, checkOut, note, organization: req.org._id, employee: employeeId, date },
      { upsert: true, new: true }
    );
    res.json({ success: true, record });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// POST /:orgId/attendance/bulk — mark all employees at once
exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body; // records: [{ employeeId, status, checkIn, checkOut }]
    const ops = records.map(r => ({
      updateOne: {
        filter: { organization: req.org._id, employee: r.employeeId, date },
        update: { $set: { status: r.status, checkIn: r.checkIn || "", checkOut: r.checkOut || "", note: r.note || "", organization: req.org._id, employee: r.employeeId, date } },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// GET /:orgId/attendance/summary?month=YYYY-MM
exports.getAttendanceSummary = async (req, res) => {
  try {
    const month   = req.query.month || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const orgId   = req.org._id;

    const employees = await Employee.find({ organization: orgId, status: { $ne: "terminated" } }).sort({ name: 1 });
    const records   = await Attendance.find({ organization: orgId, date: { $regex: `^${month}` } });

    const summary = employees.map(e => {
      const empRecords = records.filter(r => r.employee.toString() === e._id.toString());
      const counts = { present: 0, absent: 0, late: 0, "half-day": 0 };
      empRecords.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
      return {
        employee: { _id: e._id, name: e.name, role: e.role, department: e.department },
        counts,
        total: empRecords.length,
      };
    });

    res.json({ success: true, month, summary });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
