const Organization = require("../models/Organization");
const User = require("../models/User");
const Job = require("../models/Job");
const OrgInvite = require("../models/OrgInvite");
const { sendOrgInviteEmail } = require("../config/emailService");
const crypto = require("crypto");

const slugify = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const makeSlug = async (name, excludeId = null) => {
  let base = slugify(name), slug = base, i = 0;
  while (true) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    if (!(await Organization.findOne(q))) break;
    slug = `${base}-${++i}`;
  }
  return slug;
};

exports.createOrg = async (req, res) => {
  try {
    const existing = await Organization.findOne({ owner: req.user.id });
    if (existing) return res.status(400).json({ success: false, message: "You already own an organization.", slug: existing.slug });
    const { name, tagline, description, industry, website, location, size, foundedYear } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Organization name is required." });
    const slug = await makeSlug(name);
    const data = { name: name.trim(), slug, owner: req.user.id, tagline, description, industry, website, location, size, foundedYear };
    if (req.files?.logo?.[0]) { const f = req.files.logo[0]; data.logoUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`; }
    if (req.files?.cover?.[0]) { const f = req.files.cover[0]; data.coverUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`; }
    const org = await Organization.create(data);
    res.status(201).json({ success: true, org });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getMyOrg = async (req, res) => {
  try {
    const { Employee } = require("../models/Employee");
    const currentUser = await User.findById(req.user.id).select("email");
    const [owned, adminOf, empRecord] = await Promise.all([
      Organization.findOne({ owner: req.user.id }).populate("admins", "name username avatarUrl headline"),
      Organization.find({ admins: req.user.id }).populate("owner", "name username avatarUrl"),
      Employee.findOne({ email: currentUser.email, organization: { $ne: null } })
        .populate("organization", "name slug logoUrl"),
    ]);
    const memberOf = empRecord?.organization || null;
    res.json({ success: true, owned, adminOf, memberOf });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getOrg = async (req, res) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug })
      .populate("owner", "name username avatarUrl headline")
      .populate("admins", "name username avatarUrl headline");
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    const [jobs, acceptedInvites] = await Promise.all([
      Job.find({ postedBy: org.owner._id, active: true }).sort({ createdAt: -1 }).limit(6),
      OrgInvite.find({ org: org._id, status: "accepted" })
        .populate("acceptedBy", "name username avatarUrl headline")
        .sort({ updatedAt: -1 }),
    ]);
    const isFollowing = org.followers.some(f => f.toString() === req.user.id);
    const isOwner = org.owner._id.toString() === req.user.id;
    const isAdmin = org.admins.some(a => a._id.toString() === req.user.id);
    // members = accepted invites, excluding those already shown as admins
    const adminIds = new Set(org.admins.map(a => a._id.toString()));
    const members = acceptedInvites
      .filter(i => i.acceptedBy && !adminIds.has(i.acceptedBy._id.toString()))
      .map(i => ({ ...i.acceptedBy.toObject(), inviteRole: i.role }));
    const isMember = members.some(m => m._id.toString() === req.user.id);
    res.json({ success: true, org, jobs, isFollowing, isOwner, isAdmin, isMember, members });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.updateOrg = async (req, res) => {
  try {
    const org = await Organization.findOne({ _id: req.params.id, owner: req.user.id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    const allowed = ["tagline","description","industry","website","location","size","foundedYear"];
    allowed.forEach(k => { if (req.body[k] !== undefined) org[k] = req.body[k]; });
    if (req.body.services !== undefined) {
      const svc = req.body.services;
      org.services = Array.isArray(svc) ? svc.filter(Boolean) : typeof svc === "string" ? [svc].filter(Boolean) : [];
    }
    if (req.body.name && req.body.name.trim() !== org.name) {
      org.name = req.body.name.trim();
      org.slug = await makeSlug(req.body.name, org._id);
    }
    if (req.files?.logo?.[0]) { const f = req.files.logo[0]; org.logoUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`; }
    if (req.files?.cover?.[0]) { const f = req.files.cover[0]; org.coverUrl = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`; }
    await org.save();
    res.json({ success: true, org });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteOrg = async (req, res) => {
  try {
    const org = await Organization.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found or not authorized" });
    // Clean up related data
    const { Employee } = require("../models/Employee");
    const Candidate = require("../models/Candidate");
    const Lead = require("../models/Lead");
    const OrgInviteModel = require("../models/OrgInvite");
    await Promise.all([
      Employee.deleteMany({ organization: org._id }),
      Candidate.deleteMany({ organization: org._id }),
      Lead.deleteMany({ organization: org._id }),
      OrgInviteModel.deleteMany({ org: org._id }),
    ]);
    res.json({ success: true, message: "Organization deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.followOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    if (org.owner.toString() === req.user.id) return res.status(400).json({ success: false, message: "You cannot follow your own organization." });
    const idx = org.followers.findIndex(f => f.toString() === req.user.id);
    if (idx === -1) org.followers.push(req.user.id); else org.followers.splice(idx, 1);
    await org.save();
    res.json({ success: true, following: idx === -1, followerCount: org.followers.length });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.addAdmin = async (req, res) => {
  try {
    const org = await Organization.findOne({ _id: req.params.id, owner: req.user.id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    const user = await User.findOne({ username: req.body.username }).select("name username avatarUrl headline");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user._id.toString() === req.user.id) return res.status(400).json({ success: false, message: "You are already the owner." });
    if (org.admins.some(a => a.toString() === user._id.toString())) return res.status(400).json({ success: false, message: "User is already a member." });
    org.admins.push(user._id);
    await org.save();
    res.json({ success: true, admin: user });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.removeAdmin = async (req, res) => {
  try {
    const org = await Organization.findOne({ _id: req.params.id, owner: req.user.id });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });
    org.admins = org.admins.filter(a => a.toString() !== req.params.userId);
    await org.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.searchOrgs = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { $or: [{ name: { $regex: q, $options: "i" } }, { industry: { $regex: q, $options: "i" } }, { tagline: { $regex: q, $options: "i" } }] } : {};
    const orgs = await Organization.find(filter).populate("owner", "name username avatarUrl").sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, orgs });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// ── Invite System ─────────────────────────────────────────────────────

exports.sendInvite = async (req, res) => {
  try {
    const { email, role = "employee" } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const org = req.org;
    const isOwner = org.owner.toString() === req.user.id;
    const isAdmin = org.admins.some(a => a.toString() === req.user.id);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: "Not authorized" });

    // Don't invite owner
    const ownerUser = await User.findById(org.owner).select("email");
    if (ownerUser?.email === email.toLowerCase()) {
      return res.status(400).json({ success: false, message: "This person is already the org owner." });
    }

    // Cancel any existing pending invite for same email+org
    await OrgInvite.findOneAndUpdate(
      { org: org._id, email: email.toLowerCase(), status: "pending" },
      { status: "cancelled" }
    );

    const token = crypto.randomBytes(32).toString("hex");
    const inviter = await User.findById(req.user.id).select("name");
    const invite = await OrgInvite.create({
      org: org._id, email: email.toLowerCase(), role, invitedBy: req.user.id, token,
    });

    const acceptUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/invite/${token}`;
    try {
      await sendOrgInviteEmail(email, { orgName: org.name, inviterName: inviter.name, role, acceptUrl });
    } catch (emailErr) {
      console.error("Invite email failed:", emailErr.message);
    }

    res.status(201).json({ success: true, invite: { ...invite.toObject(), acceptUrl } });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getInvites = async (req, res) => {
  try {
    const invites = await OrgInvite.find({ org: req.org._id, status: "pending" })
      .populate("invitedBy", "name avatarUrl")
      .sort({ createdAt: -1 });
    res.json({ success: true, invites });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.cancelInvite = async (req, res) => {
  try {
    await OrgInvite.findOneAndUpdate(
      { _id: req.params.inviteId, org: req.org._id, status: "pending" },
      { status: "cancelled" }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getInviteByToken = async (req, res) => {
  try {
    const invite = await OrgInvite.findOne({ token: req.params.token })
      .populate("org", "name logoUrl slug")
      .populate("invitedBy", "name avatarUrl");
    if (!invite) return res.status(404).json({ success: false, message: "Invite not found or already used." });
    if (invite.status !== "pending") return res.status(400).json({ success: false, message: `Invite has been ${invite.status}.` });
    if (new Date() > invite.expiresAt) {
      await OrgInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({ success: false, message: "This invitation has expired." });
    }
    res.json({ success: true, invite });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.acceptInvite = async (req, res) => {
  try {
    const invite = await OrgInvite.findOne({ token: req.params.token, status: "pending" })
      .populate("org");
    if (!invite) return res.status(404).json({ success: false, message: "Invite not found or already used." });
    if (new Date() > invite.expiresAt) {
      await OrgInvite.findByIdAndUpdate(invite._id, { status: "expired" });
      return res.status(400).json({ success: false, message: "This invitation has expired." });
    }

    const user = await User.findById(req.user.id).select("name email role department avatarUrl");
    if (user.email !== invite.email) {
      return res.status(403).json({ success: false, message: `This invite was sent to ${invite.email}. Please login with that account.` });
    }

    const org = invite.org;

    // Add to org admins if hr or admin role
    if (invite.role === "hr" || invite.role === "admin") {
      if (!org.admins.some(a => a.toString() === req.user.id)) {
        org.admins.push(req.user.id);
        await org.save();
      }
    }

    // Add to HRMS employees
    const { Employee } = require("../models/Employee");
    const existing = await Employee.findOne({ organization: org._id, email: user.email });
    if (!existing) {
      await Employee.create({
        name:         user.name,
        email:        user.email,
        department:   invite.role === "hr" ? "HR" : invite.role === "admin" ? "Management" : "General",
        role:         invite.role === "hr" ? "HR Manager" : invite.role === "admin" ? "Admin" : "Employee",
        organization: org._id,
        status:       "active",
      });
    }

    // Update user role if being added as hr
    if (invite.role === "hr" && user.role === "employee") {
      await User.findByIdAndUpdate(req.user.id, { role: "hr" });
    }

    // Mark invite accepted
    await OrgInvite.findByIdAndUpdate(invite._id, { status: "accepted", acceptedBy: req.user.id });

    res.json({ success: true, orgSlug: org.slug, message: `Welcome to ${org.name}!` });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.getWorkspaceStats = async (req, res) => {
  try {
    const Candidate = require("../models/Candidate");
    const Lead = require("../models/Lead");
    const { Employee } = require("../models/Employee");
    const orgId = req.org._id;
    const [candidates, leads, employees] = await Promise.all([
      Candidate.countDocuments({ organization: orgId }),
      Lead.find({ organization: orgId }).select("value stage"),
      Employee.countDocuments({ organization: orgId }),
    ]);
    const pipeline = leads.filter(l => !["closed_won","closed_lost"].includes(l.stage)).reduce((s, l) => s + (l.value || 0), 0);
    const won = leads.filter(l => l.stage === "closed_won").reduce((s, l) => s + (l.value || 0), 0);
    res.json({ success: true, stats: { candidates, leads: leads.length, employees, pipeline, won } });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
