const Job=require("../models/Job"),Notification=require("../models/Notification"),User=require("../models/User");
const { sendInterviewScheduledEmail } = require("../config/emailService");

exports.getJobs=async(req,res)=>{
  try{
    const{type,level,search}=req.query;
    const filter={active:true};
    if(type&&type!=="All Types")filter.type=type;
    if(level&&level!=="All Levels")filter.level=level;
    if(search)filter.$or=[{title:{$regex:search,$options:"i"}},{company:{$regex:search,$options:"i"}},{skills:{$regex:search,$options:"i"}}];
    const jobs=await Job.find(filter).populate("postedBy","name username avatarUrl").sort({createdAt:-1});
    const appliedData={};
    jobs.forEach(j=>{
      const app=j.applicants.find(a=>a.user?.toString()===req.user.id);
      if(app)appliedData[j._id.toString()]=app.status||"pending";
    });
    const savedIds=jobs.filter(j=>j.saved.map(String).includes(req.user.id)).map(j=>j._id.toString());
    res.json({success:true,jobs,appliedIds:Object.keys(appliedData),appliedData,savedIds});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getMyPostedJobs=async(req,res)=>{
  try{
    const jobs=await Job.find({postedBy:req.user.id}).sort({createdAt:-1});
    res.json({success:true,jobs});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getApplicants=async(req,res)=>{
  try{
    const job=await Job.findOne({_id:req.params.id,postedBy:req.user.id}).populate("applicants.user","name username avatarUrl headline location skills");
    if(!job)return res.status(404).json({success:false,message:"Job not found"});
    res.json({success:true,applicants:job.applicants});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.createJob=async(req,res)=>{
  try{
    const poster=await User.findById(req.user.id).select("role");
    if(poster.role!=="recruiter")return res.status(403).json({success:false,message:"Only recruiters can post jobs"});
    const job=await Job.create({...req.body,postedBy:req.user.id});
    res.status(201).json({success:true,job});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.deleteJob=async(req,res)=>{
  try{
    const job=await Job.findOneAndDelete({_id:req.params.id,postedBy:req.user.id});
    if(!job)return res.status(404).json({success:false,message:"Job not found"});
    res.json({success:true,message:"Job deleted"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.closeJob=async(req,res)=>{
  try{
    const job=await Job.findOne({_id:req.params.id,postedBy:req.user.id});
    if(!job)return res.status(404).json({success:false,message:"Job not found"});
    job.active=!job.active;
    await job.save();
    res.json({success:true,active:job.active});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.applyJob=async(req,res)=>{
  try{
    const job=await Job.findById(req.params.id).populate("postedBy","name");
    if(!job)return res.status(404).json({success:false,message:"Not found"});
    if(job.applicants.some(a=>a.user?.toString()===req.user.id))
      return res.status(400).json({success:false,message:"Already applied"});
    const application={user:req.user.id};
    if(req.body.coverNote)application.coverNote=req.body.coverNote.trim().slice(0,500);
    if(req.file)application.resumeUrl=`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    job.applicants.push(application);
    await job.save();
    if(job.postedBy&&job.postedBy._id.toString()!==req.user.id)
      await Notification.create({recipient:job.postedBy._id,sender:req.user.id,type:"job",message:`applied to your job: ${job.title}`,link:"/jobs"});
    res.json({success:true,message:"Applied successfully",status:"pending"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.saveJob=async(req,res)=>{
  try{
    const job=await Job.findById(req.params.id);
    if(!job)return res.status(404).json({success:false,message:"Not found"});
    const idx=job.saved.map(String).indexOf(req.user.id);
    if(idx===-1)job.saved.push(req.user.id);else job.saved.splice(idx,1);
    await job.save();
    res.json({success:true,saved:idx===-1});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.getSavedJobs=async(req,res)=>{
  try{
    const jobs=await Job.find({saved:req.user.id}).populate("postedBy","name username avatarUrl").sort({createdAt:-1});
    res.json({success:true,jobs});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};

exports.updateApplicationStatus=async(req,res)=>{
  try{
    const{status}=req.body;
    const VALID=["pending","reviewed","shortlisted","rejected"];
    if(!VALID.includes(status))return res.status(400).json({success:false,message:"Invalid status"});
    const job=await Job.findOne({_id:req.params.id,postedBy:req.user.id});
    if(!job)return res.status(404).json({success:false,message:"Job not found"});
    const app=job.applicants.find(a=>a.user.toString()===req.params.userId);
    if(!app)return res.status(404).json({success:false,message:"Applicant not found"});
    app.status=status;
    await job.save();
    const notifMessages={
      reviewed:`Your application for "${job.title}" at ${job.company} has been reviewed.`,
      rejected:`Your application for "${job.title}" at ${job.company} was not selected at this time. Thank you for applying.`,
    };
    if(notifMessages[status])
      await Notification.create({recipient:app.user,sender:req.user.id,type:"job",message:notifMessages[status],link:"/jobs"});
    res.json({success:true,status});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};
exports.scheduleInterview=async(req,res)=>{
  try{
    const{date,time,meetLink}=req.body;
    if(!date||!time||!meetLink)
      return res.status(400).json({success:false,message:"Date, time and meet link are required"});
    const job=await Job.findOne({_id:req.params.id,postedBy:req.user.id})
      .populate("applicants.user","name email");
    if(!job)return res.status(404).json({success:false,message:"Job not found"});
    const app=job.applicants.find(a=>a.user?._id?.toString()===req.params.userId||a.user?.toString()===req.params.userId);
    if(!app)return res.status(404).json({success:false,message:"Applicant not found"});
    app.status="shortlisted";
    app.interview={date,time,meetLink,scheduledAt:new Date()};
    await job.save();
    if(app.user?.email){
      sendInterviewScheduledEmail(app.user.email,app.user.name,{
        jobTitle:job.title,company:job.company,date,time,meetLink
      }).catch(()=>{});
    }
    res.json({success:true,message:"Interview scheduled"});
  }catch(e){res.status(500).json({success:false,message:"Server Error"});}
};
