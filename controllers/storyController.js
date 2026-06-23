const Story = require("../models/Story");
const User  = require("../models/User");

exports.getStories = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("connections");
    const authorIds = [...(user.connections || []), req.user.id];

    const stories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() },
    }).populate("author", "name username avatarUrl").sort({ createdAt: -1 });

    // Group by author
    const map = new Map();
    stories.forEach(s => {
      const aid = s.author._id.toString();
      if (!map.has(aid)) map.set(aid, { author: s.author, stories: [] });
      map.get(aid).stories.push(s);
    });

    // Own stories first
    const grouped = Array.from(map.values());
    const myIdx = grouped.findIndex(g => g.author._id.toString() === req.user.id);
    if (myIdx > 0) grouped.unshift(grouped.splice(myIdx, 1)[0]);

    res.json({ success: true, stories: grouped });
  } catch(e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.createStory = async (req, res) => {
  try {
    const { caption, bgColor } = req.body;
    let media;
    if (req.file) {
      media = {
        data: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        mimeType: req.file.mimetype,
        type: req.file.mimetype.startsWith("video") ? "video" : "image",
      };
    }
    if (!media && !caption?.trim()) return res.status(400).json({ success: false, message: "Story needs text or image" });
    const story = await Story.create({ author: req.user.id, caption: caption || "", bgColor: bgColor || "from-violet-500 to-pink-500", media });
    await story.populate("author", "name username avatarUrl");
    res.status(201).json({ success: true, story });
  } catch(e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });
    if (!story.viewers.includes(req.user.id)) {
      story.viewers.push(req.user.id);
      await story.save();
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });
    if (story.author.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });
    await story.deleteOne();
    res.json({ success: true, message: "Story deleted" });
  } catch(e) { res.status(500).json({ success: false, message: "Server Error" }); }
};
