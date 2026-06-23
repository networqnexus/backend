const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const c    = require("../controllers/projectController");

router.get("/explore", auth, c.exploreProjects);
router.get("/",        auth, c.getMyProjects);
router.post("/",       auth, c.createProject);
router.put("/:id",     auth, c.updateProject);
router.delete("/:id",  auth, c.deleteProject);

module.exports = router;
