const multer=require("multer");
const storage=multer.memoryStorage();
const fileFilter=(req,file,cb)=>{const allowed=["image/jpeg","image/jpg","image/png","image/gif","image/webp","video/mp4"];if(allowed.includes(file.mimetype))cb(null,true);else cb(new Error("Only images and videos allowed"),false);};
const upload=multer({storage,fileFilter,limits:{fileSize:5*1024*1024}});

const resumeFilter=(req,file,cb)=>{if(file.mimetype==="application/pdf")cb(null,true);else cb(new Error("Only PDF files are allowed"),false);};
const resumeUpload=multer({storage,fileFilter:resumeFilter,limits:{fileSize:2*1024*1024}});

module.exports=upload;
module.exports.resumeUpload=resumeUpload;
