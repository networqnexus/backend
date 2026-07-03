const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/searchController");
router.get("/history",auth,c.getSearchHistory);
router.delete("/history/clear",auth,c.clearSearchHistory);
router.delete("/history/:id",auth,c.deleteSearchHistoryItem);
router.get("/",auth,c.search);
module.exports=router;
