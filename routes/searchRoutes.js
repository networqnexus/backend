const express=require("express"),router=express.Router();
const auth=require("../middleware/authMiddleware");
const c=require("../controllers/searchController");
router.get("/",auth,c.search);
module.exports=router;
