const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/crmController");
router.get("/", auth, c.getLeads);
router.get("/stats", auth, c.getStats);
router.post("/", auth, c.addLead);
router.put("/:id", auth, c.updateLead);
router.delete("/:id", auth, c.deleteLead);
module.exports = router;
