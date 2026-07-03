const multer=require("multer");
const storage=multer.memoryStorage();
const fileFilter=(req,file,cb)=>{const allowed=["image/jpeg","image/jpg","image/png","image/gif","image/webp","video/mp4"];if(allowed.includes(file.mimetype))cb(null,true);else cb(new Error("Only images and videos allowed"),false);};
const upload=multer({storage,fileFilter,limits:{fileSize:5*1024*1024}});

const resumeFilter=(req,file,cb)=>{if(file.mimetype==="application/pdf")cb(null,true);else cb(new Error("Only PDF files are allowed"),false);};
const resumeUpload=multer({storage,fileFilter:resumeFilter,limits:{fileSize:2*1024*1024}});

const chatFilter=(req,file,cb)=>{
  const allowed=[
    "image/jpeg","image/jpg","image/png","image/gif","image/webp","video/mp4",
    "application/pdf","text/plain",
    "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
  ];
  if(allowed.includes(file.mimetype))cb(null,true);else cb(new Error("File type not supported"),false);
};
const chatUpload=multer({storage,fileFilter:chatFilter,limits:{fileSize:10*1024*1024}});

module.exports=upload;
module.exports.resumeUpload=resumeUpload;
module.exports.chatUpload=chatUpload;
