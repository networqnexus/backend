const express = require("express"), router = express.Router();
const auth    = require("../middleware/authMiddleware");
const premium = require("../middleware/premiumMiddleware");
const c       = require("../controllers/atsController");

router.use(auth, premium);
router.get("/", c.getCandidates);
router.get("/stats", c.getStats);
router.post("/", c.addCandidate);
router.put("/:id/stage", c.updateStage);
router.put("/:id/rating", c.updateRating);
router.delete("/:id", c.deleteCandidate);
module.exports = router;
