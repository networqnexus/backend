const express = require("express"), router = express.Router();
const auth    = require("../middleware/authMiddleware");
const premium = require("../middleware/premiumMiddleware");
const c       = require("../controllers/atsController");

router.use(auth, premium);

// Core
router.get("/",                                           c.getCandidates);
router.get("/stats",                                      c.getStats);
router.get("/report",                                     c.getReport);
router.get("/report/hiring-assistant",                    c.getHiringAssistant);
router.post("/",                                          c.addCandidate);
router.post("/parse-resume",                              c.parseResume);

// Single candidate
router.get("/:id",                                        c.getCandidate);
router.put("/:id/stage",                                  c.updateStage);
router.put("/:id/rating",                                 c.updateRating);
router.put("/:id/notes",                                  c.updateNotes);
router.put("/:id/offer",                                  c.updateOffer);
router.put("/:id/approval",                               c.updateApproval);
router.post("/:id/onboard",                               c.triggerOnboarding);
router.delete("/:id",                                     c.deleteCandidate);

// Interviews
router.post("/:id/interviews",                            c.scheduleInterview);
router.put("/:id/interviews/:interviewId",                c.updateInterview);
router.post("/:id/interviews/:interviewId/feedback",      c.submitFeedback);

module.exports = router;
