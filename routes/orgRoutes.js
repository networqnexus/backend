const express    = require("express"), router = express.Router();
const auth       = require("../middleware/authMiddleware");
const orgMW      = require("../middleware/orgMiddleware");
const upload     = require("../config/upload");
const c          = require("../controllers/orgController");
const ats        = require("../controllers/atsController");
const crm        = require("../controllers/crmController");
const hrms       = require("../controllers/hrmsController");
const att        = require("../controllers/attendanceController");

// ── Org CRUD & Social ─────────────────────────────────────────────────
router.post("/",           auth, upload.fields([{name:"logo",maxCount:1},{name:"cover",maxCount:1}]), c.createOrg);
router.get("/mine",        auth, c.getMyOrg);
router.get("/search",      auth, c.searchOrgs);

// ── Invite routes (BEFORE /:slug to avoid param conflict) ─────────────
router.get("/invites/:token",          c.getInviteByToken);          // public
router.post("/invites/:token/accept",  auth, c.acceptInvite);

router.get("/:slug",       auth, c.getOrg);
router.put("/:id",         auth, upload.fields([{name:"logo",maxCount:1},{name:"cover",maxCount:1}]), c.updateOrg);
router.delete("/:id",      auth, c.deleteOrg);
router.put("/:id/follow",  auth, c.followOrg);
router.delete("/:id/leave", auth, c.leaveOrg);
router.post("/:id/admins",             auth, c.addAdmin);
router.delete("/:id/admins/:userId",   auth, c.removeAdmin);

// ── Org Workspace — ATS ───────────────────────────────────────────────
router.get("/:orgId/ats/candidates",              auth, orgMW, ats.getCandidates);
router.post("/:orgId/ats/candidates",             auth, orgMW, ats.addCandidate);
router.put("/:orgId/ats/candidates/:id/stage",    auth, orgMW, ats.updateStage);
router.put("/:orgId/ats/candidates/:id/rating",   auth, orgMW, ats.updateRating);
router.put("/:orgId/ats/candidates/:id/notes",    auth, orgMW, ats.updateNotes);
router.delete("/:orgId/ats/candidates/:id",       auth, orgMW, ats.deleteCandidate);
router.get("/:orgId/ats/report",                  auth, orgMW, ats.getReport);
router.get("/:orgId/ats/report/hiring-assistant",  auth, orgMW, ats.getHiringAssistant);
router.get("/:orgId/ats/jobs",                     auth, orgMW, ats.getOrgJobs);
router.post("/:orgId/ats/jobs",                    auth, orgMW, ats.createOrgJob);
router.put("/:orgId/ats/jobs/:id/toggle",          auth, orgMW, ats.toggleOrgJob);
router.delete("/:orgId/ats/jobs/:id",              auth, orgMW, ats.deleteOrgJob);

// ── Org Workspace — CRM ───────────────────────────────────────────────
router.get("/:orgId/crm/leads",         auth, orgMW, crm.getLeads);
router.post("/:orgId/crm/leads",        auth, orgMW, crm.addLead);
router.put("/:orgId/crm/leads/:id",     auth, orgMW, crm.updateLead);
router.delete("/:orgId/crm/leads/:id",  auth, orgMW, crm.deleteLead);
router.get("/:orgId/crm/stats",         auth, orgMW, crm.getStats);

// ── Org Workspace — HRMS ─────────────────────────────────────────────
router.get("/:orgId/hrms/employees",           auth, orgMW, hrms.getEmployees);
router.post("/:orgId/hrms/employees",          auth, orgMW, hrms.addEmployee);
router.put("/:orgId/hrms/employees/:id",       auth, orgMW, hrms.updateEmployee);
router.delete("/:orgId/hrms/employees/:id",    auth, orgMW, hrms.deleteEmployee);
router.get("/:orgId/hrms/leaves",              auth, orgMW, hrms.getLeaveRequests);
router.put("/:orgId/hrms/leaves/:id",          auth, orgMW, hrms.updateLeaveStatus);
router.get("/:orgId/hrms/stats",               auth, orgMW, hrms.getStats);

// ── Org Workspace — Stats ─────────────────────────────────────────────
router.get("/:orgId/workspace/stats",  auth, orgMW, c.getWorkspaceStats);

// ── Org Attendance ────────────────────────────────────────────────────
router.get("/:orgId/attendance",              auth, orgMW, att.getAttendance);
router.post("/:orgId/attendance",             auth, orgMW, att.markAttendance);
router.post("/:orgId/attendance/bulk",        auth, orgMW, att.bulkMarkAttendance);
router.get("/:orgId/attendance/summary",      auth, orgMW, att.getAttendanceSummary);

// ── Org Invites (workspace) ────────────────────────────────────────────
router.post("/:orgId/invites",              auth, orgMW, c.sendInvite);
router.get("/:orgId/invites",               auth, orgMW, c.getInvites);
router.delete("/:orgId/invites/:inviteId",  auth, orgMW, c.cancelInvite);

module.exports = router;
