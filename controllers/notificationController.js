const Notification=require("../models/Notification");
const User = require("../models/User");

exports.getNotifications=async(req,res)=>{
  try{
    const notifications=await Notification.find({recipient:req.user.id}).populate("sender","name username avatarUrl").sort({createdAt:-1}).limit(50);
    const unreadCount=await Notification.countDocuments({recipient:req.user.id,read:false});
    res.json({success:true,notifications,unreadCount});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.markAllRead=async(req,res)=>{
  try{
    await Notification.updateMany({recipient:req.user.id,read:false},{read:true});
    res.json({success:true,message:"All notifications marked as read"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.deleteNotification=async(req,res)=>{
  try{
    await Notification.findOneAndDelete({_id:req.params.id,recipient:req.user.id});
    res.json({success:true,message:"Notification deleted"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.clearAll=async(req,res)=>{
  try{
    await Notification.deleteMany({recipient:req.user.id});
    res.json({success:true,message:"All notifications cleared"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};
