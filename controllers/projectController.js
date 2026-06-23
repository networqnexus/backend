const Project = require("../models/Project");

// GET /api/projects — my projects
exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id })
      .populate("owner", "name username avatarUrl")
      .sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// GET /api/projects/explore — all users' projects
exports.exploreProjects = async (req, res) => {
  try {
    const { q, status, tech } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tech)   filter.techStack = { $in: [new RegExp(tech, "i")] };
    if (q)      filter.$or = [
      { name:        { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { techStack:   { $in: [new RegExp(q, "i")] } },
    ];
    const projects = await Project.find(filter)
      .populate("owner", "name username avatarUrl headline")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, projects });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const { name, description, techStack, status, githubUrl, liveUrl, thumbnail } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Project name is required" });
    const project = await Project.create({
      owner: req.user.id, name, description, status: status || "active",
      techStack: Array.isArray(techStack) ? techStack : [],
      githubUrl: githubUrl || "", liveUrl: liveUrl || "",
      thumbnail: thumbnail || "",
    });
    await project.populate("owner", "name username avatarUrl");
    res.status(201).json({ success: true, project });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    const { name, description, techStack, status, githubUrl, liveUrl, thumbnail } = req.body;
    if (name)        project.name        = name;
    if (description !== undefined) project.description = description;
    if (techStack)   project.techStack   = techStack;
    if (status)      project.status      = status;
    if (githubUrl !== undefined) project.githubUrl = githubUrl;
    if (liveUrl   !== undefined) project.liveUrl   = liveUrl;
    if (thumbnail !== undefined) project.thumbnail = thumbnail;
    await project.save();
    await project.populate("owner", "name username avatarUrl");
    res.json({ success: true, project });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

// DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, message: "Project deleted" });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
