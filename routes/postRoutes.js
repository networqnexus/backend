const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/postController");
const upload = require("../config/upload");

router.get("/",               auth, c.getPosts);
router.get("/my",             auth, c.getMyPosts);
router.get("/saved",          auth, c.getSavedPosts);
router.post("/",              auth, upload.single("media"), c.createPost);
router.put("/:id/like",      auth, c.likePost);
router.put("/:id/save",      auth, c.toggleSave);
router.put("/:id/edit",      auth, c.editPost);
router.post("/:id/comment",  auth, c.commentPost);
router.delete("/:id",        auth, c.deletePost);

module.exports = router;