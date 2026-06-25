const User = require("../models/User");
const Post = require("../models/Post");

exports.getMe = async (req, res) => {
  try {
    const user=await User.findById(req.user.id).select("-password").populate("connections","name username avatarUrl headline");
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    res.json({success:true,user});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getProfile = async (req, res) => {
  try {
    const user=await User.findOne({username:req.params.username}).select("-password").populate("connections","name username avatarUrl headline");
    if(!user) return res.status(404).json({success:false,message:"User not found"});
    if(user._id.toString()!==req.user.id) await User.findByIdAndUpdate(user._id,{$inc:{profileViews:1}});
    const posts=await Post.find({author:user._id,visibility:"public"}).sort({createdAt:-1}).limit(5).populate("author","name username avatarUrl headline");
    res.json({success:true,user,posts});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed=["headline","bio","website","skills","goals","openToWork","location","experience","education","certifications","name","contactNumber","hideOnlineStatus","role"];
    const updates={};
    allowed.forEach(k=>{if(req.body[k]!==undefined)updates[k]=req.body[k];});
    if(req.files?.avatar?.[0]){const f=req.files.avatar[0];updates.avatarUrl=`data:${f.mimetype};base64,${f.buffer.toString("base64")}`;}
    if(req.files?.cover?.[0]){const f=req.files.cover[0];updates.coverUrl=`data:${f.mimetype};base64,${f.buffer.toString("base64")}`;}
    const user=await User.findByIdAndUpdate(req.user.id,updates,{new:true}).select("-password");
    res.json({success:true,user});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getStats = async (req, res) => {
  try {
    const user=await User.findById(req.user.id).select("profileViews searchAppearances connections");
    const postCount=await Post.countDocuments({author:req.user.id});
    const totalLikes=await Post.aggregate([{$match:{author:user._id}},{$project:{likeCount:{$size:"$likes"}}},{$group:{_id:null,total:{$sum:"$likeCount"}}}]);
    res.json({success:true,stats:{profileViews:user.profileViews,searchAppearances:user.searchAppearances,connections:user.connections.length,posts:postCount,totalLikes:totalLikes[0]?.total||0}});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.changePassword = async (req, res) => {
  try {
    const {currentPassword,newPassword}=req.body;
    const bcrypt=require("bcryptjs");
    const user=await User.findById(req.user.id);
    const isMatch=await bcrypt.compare(currentPassword,user.password);
    if(!isMatch) return res.status(400).json({success:false,message:"Current password is incorrect"});
    user.password=await bcrypt.hash(newPassword,10);
    await user.save();
    res.json({success:true,message:"Password updated successfully"});
  } catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.endorseSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill) return res.status(400).json({ success:false, message:"Skill required" });
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ success:false, message:"User not found" });
    if (target._id.toString() === req.user.id) return res.status(400).json({ success:false, message:"Cannot endorse your own skill" });
    if (!target.skills.includes(skill)) return res.status(400).json({ success:false, message:"User doesn't have this skill" });

    const idx = target.endorsements.findIndex(e => e.skill === skill);
    let endorsed = true;
    if (idx === -1) {
      target.endorsements.push({ skill, endorsedBy: [req.user.id] });
    } else {
      const alreadyIdx = target.endorsements[idx].endorsedBy.findIndex(id => id.toString() === req.user.id);
      if (alreadyIdx !== -1) {
        target.endorsements[idx].endorsedBy.splice(alreadyIdx, 1);
        endorsed = false;
        if (target.endorsements[idx].endorsedBy.length === 0) target.endorsements.splice(idx, 1);
      } else {
        target.endorsements[idx].endorsedBy.push(req.user.id);
      }
    }
    await target.save();
    res.json({ success:true, endorsed, endorsements: target.endorsements });
  } catch(e) { res.status(500).json({ success:false, message:"Server Error" }); }
};
