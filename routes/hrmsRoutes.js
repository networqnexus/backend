const express = require("express"), router = express.Router();
const auth    = require("../middleware/authMiddleware");
const premium = require("../middleware/premiumMiddleware");
const c       = require("../controllers/hrmsController");

router.use(auth, premium);
router.get("/employees", c.getEmployees);
router.get("/stats", c.getStats);
router.post("/employees", c.addEmployee);
router.put("/employees/:id", c.updateEmployee);
router.delete("/employees/:id", c.deleteEmployee);
router.get("/leave", c.getLeaveRequests);
router.post("/leave", c.addLeaveRequest);
router.put("/leave/:id/status", c.updateLeaveStatus);
module.exports = router;
