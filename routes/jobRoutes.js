const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/jobController");
const {resumeUpload}=require("../config/upload");

router.get("/saved",          auth, c.getSavedJobs);
router.get("/my-posted",      auth, c.getMyPostedJobs);
router.get("/:id/applicants", auth, c.getApplicants);
router.get("/",               auth, c.getJobs);
router.post("/",              auth, c.createJob);
router.put("/:id/apply",      auth, resumeUpload.single("resume"), c.applyJob);
router.put("/:id/save",       auth, c.saveJob);
router.put("/:id/toggle",     auth, c.closeJob);
router.put("/:id/applicant/:userId/status", auth, c.updateApplicationStatus);
router.delete("/:id",         auth, c.deleteJob);

module.exports = router;
