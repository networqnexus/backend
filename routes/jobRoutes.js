const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/jobController");
router.get("/",auth,c.getJobs);
router.get("/saved",auth,c.getSavedJobs);
router.post("/",auth,c.createJob);
router.put("/:id/apply",auth,c.applyJob);
router.put("/:id/save",auth,c.saveJob);
module.exports=router;
