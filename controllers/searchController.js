const User=require("../models/User"),Post=require("../models/Post"),Job=require("../models/Job"),SearchHistory=require("../models/SearchHistory");
exports.search=async(req,res)=>{try{const{q,type}=req.query;if(!q)return res.status(400).json({success:false,message:"Query required"});const regex={$regex:q,$options:"i"};const results={};if(!type||type==="people")results.people=await User.find({$or:[{name:regex},{username:regex},{headline:regex}],_id:{$ne:req.user.id}}).select("name username headline avatarUrl location connections").limit(10);if(!type||type==="posts")results.posts=await Post.find({$or:[{content:regex},{tags:regex}],visibility:"public"}).populate("author","name username avatarUrl").limit(10);if(!type||type==="jobs")results.jobs=await Job.find({$or:[{title:regex},{company:regex},{skills:regex}],active:true}).limit(10);SearchHistory.findOneAndUpdate({user:req.user.id,query:q.trim()},{},{upsert:true,setDefaultsOnInsert:true}).catch(()=>{});res.json({success:true,results});}catch(e){res.status(500).json({success:false,message:"Server Error"});}};

exports.getSearchHistory=async(req,res)=>{
  try{
    const history=await SearchHistory.find({user:req.user.id}).sort({updatedAt:-1}).limit(20);
    res.json({success:true,history});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.deleteSearchHistoryItem=async(req,res)=>{
  try{
    await SearchHistory.findOneAndDelete({_id:req.params.id,user:req.user.id});
    res.json({success:true,message:"Search history item deleted"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.clearSearchHistory=async(req,res)=>{
  try{
    await SearchHistory.deleteMany({user:req.user.id});
    res.json({success:true,message:"Search history cleared"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};
