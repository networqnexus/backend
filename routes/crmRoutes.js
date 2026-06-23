const express = require("express"), router = express.Router();
const auth    = require("../middleware/authMiddleware");
const premium = require("../middleware/premiumMiddleware");
const c       = require("../controllers/crmController");

router.use(auth, premium);
router.get("/", c.getLeads);
router.get("/stats", c.getStats);
router.post("/", c.addLead);
router.put("/:id", c.updateLead);
router.delete("/:id", c.deleteLead);
module.exports = router;
