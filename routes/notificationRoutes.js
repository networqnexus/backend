const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/notificationController");
router.get("/",         auth, c.getNotifications);
router.put("/read-all", auth, c.markAllRead);
router.delete("/clear", auth, c.clearAll);
router.delete("/:id",   auth, c.deleteNotification);
module.exports=router;
