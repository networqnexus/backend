const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const populate = (q) => q.populate("author","name username headline avatarUrl").populate("comments.user","name username avatarUrl");

exports.getPosts = async (req, res) => {
  try {
    const page=parseInt(req.query.page)||1, limit=parseInt(req.query.limit)||10;
    const posts = await populate(Post.find({visibility:"public"}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit));
    const total = await Post.countDocuments({visibility:"public"});
    res.json({success:true,posts,total,page,hasMore:page*limit<total});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.createPost = async (req, res) => {
  try {
    const {content,tags,visibility}=req.body;
    if(!content?.trim()) return res.status(400).json({success:false,message:"Content required"});
    let media;
    if(req.file){const b64=req.file.buffer.toString("base64");media={data:`data:${req.file.mimetype};base64,${b64}`,mimeType:req.file.mimetype,type:req.file.mimetype.startsWith("video")?"video":"image"};}
    const post=await Post.create({author:req.user.id,content,tags:tags?JSON.parse(tags):[],visibility:visibility||"public",media});
    const populated=await populate(Post.findById(post._id));
    res.status(201).json({success:true,post:populated});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author","name username");
    if (!post) return res.status(404).json({ success:false, message:"Post not found" });
    const type = req.body?.type || "like";
    const existingIdx = post.reactions.findIndex(r => r.user.toString() === req.user.id);
    let reacted = true;
    if (existingIdx !== -1) {
      if (post.reactions[existingIdx].type === type) {
        post.reactions.splice(existingIdx, 1);
        reacted = false;
      } else {
        post.reactions[existingIdx].type = type;
      }
    } else {
      post.reactions.push({ user: req.user.id, type });
      if (post.author._id.toString() !== req.user.id) {
        const notif = await Notification.create({ recipient:post.author._id, sender:req.user.id, type:"like", message:"reacted to your post", link:"/feed" });
        await notif.populate("sender","name username avatarUrl");
        const sid = req.onlineUsers?.get(post.author._id.toString());
        if (sid) req.io?.to(sid).emit("new_notification", { notification: notif });
      }
    }
    await post.save();
    res.json({ success:true, reactions:post.reactions, reacted, type });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.toggleSave = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const postId = req.params.id;
    const idx = user.savedPosts.findIndex(id => id.toString() === postId);
    if (idx === -1) user.savedPosts.push(postId);
    else user.savedPosts.splice(idx, 1);
    await user.save();
    res.json({ success:true, saved: idx === -1 });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "savedPosts",
      populate: [
        { path: "author", select: "name username headline avatarUrl" },
        { path: "comments.user", select: "name username avatarUrl" },
      ],
    });
    res.json({ success:true, posts: (user.savedPosts || []).slice().reverse() });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};

exports.commentPost = async (req, res) => {
  try {
    const {text}=req.body;
    if(!text?.trim()) return res.status(400).json({success:false,message:"Comment required"});
    const post=await Post.findById(req.params.id).populate("author","name username");
    if(!post) return res.status(404).json({success:false,message:"Post not found"});
    post.comments.push({user:req.user.id,text});
    await post.save();
    await post.populate("comments.user","name username avatarUrl");
    if(post.author._id.toString()!==req.user.id){
      const notif = await Notification.create({recipient:post.author._id,sender:req.user.id,type:"comment",message:"commented on your post",link:"/feed"});
      await notif.populate("sender","name username avatarUrl");
      const sid = req.onlineUsers?.get(post.author._id.toString());
      if (sid) req.io?.to(sid).emit("new_notification", { notification: notif });
    }
    res.status(201).json({success:true,comment:post.comments[post.comments.length-1]});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.deletePost = async (req, res) => {
  try {
    const post=await Post.findById(req.params.id);
    if(!post) return res.status(404).json({success:false,message:"Post not found"});
    if(post.author.toString()!==req.user.id) return res.status(403).json({success:false,message:"Not authorized"});
    await post.deleteOne();
    res.json({success:true,message:"Post deleted"});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getMyPosts = async (req, res) => {
  try {
    const posts=await populate(Post.find({author:req.user.id}).sort({createdAt:-1}));
    res.json({success:true,posts});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getTrendingHashtags = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const results = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, visibility: "public" } },
      {
        $project: {
          tagsList: {
            $concatArrays: [
              {
                $map: {
                  input: "$tags",
                  as: "t",
                  in: {
                    $cond: [
                      { $regexMatch: { input: "$$t", regex: /^#/ } },
                      { $toLower: "$$t" },
                      { $toLower: { $concat: ["#", "$$t"] } }
                    ]
                  }
                }
              },
              {
                $map: {
                  input: { $regexFindAll: { input: "$content", regex: /#\w+/ } },
                  as: "m",
                  in: { $toLower: "$$m.match" }
                }
              }
            ]
          }
        }
      },
      { $unwind: "$tagsList" },
      { $group: { _id: "$tagsList", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, tag: "$_id", count: 1 } }
    ]);
    res.json({ success: true, trending: results });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};

exports.editPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: "Content required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });
    post.content = content;
    await post.save();
    await post.populate("author", "name username headline avatarUrl");
    res.json({ success: true, post });
  } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
};