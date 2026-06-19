const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/messageController");
router.get("/conversations",auth,c.getConversations);
router.get("/:userId",auth,c.getMessages);
router.post("/:userId",auth,c.sendMessage);
module.exports=router;
