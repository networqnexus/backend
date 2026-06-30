const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");
const Job = require("../models/Job");
const Message = require("../models/Message");

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("profileViews connections");
    const posts = await Post.find({ author: userId });
    const totalLikes = posts.reduce((sum, p) => sum + p.reactions.length, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);

    // Posts per day last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPosts = await Post.aggregate([
      { $match: { author: user._id, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, likes: { $sum: { $size: "$reactions" } } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        profileViews: user.profileViews || 0,
        connections: user.connections.length,
        posts: posts.length,
        totalLikes,
        totalComments,
        recentActivity: recentPosts,
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
});

module.exports = router;
