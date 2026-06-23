const express = require("express"), router = express.Router();
const auth   = require("../middleware/authMiddleware");
const upload = require("../config/upload");
const c      = require("../controllers/storyController");

router.get("/",           auth, c.getStories);
router.post("/",          auth, upload.single("media"), c.createStory);
router.put("/:id/view",   auth, c.viewStory);
router.delete("/:id",     auth, c.deleteStory);

module.exports = router;
