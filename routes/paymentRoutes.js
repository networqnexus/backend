const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const c    = require("../controllers/paymentController");

// /webhook is registered in server.js BEFORE express.json() to get raw body
router.post("/create-checkout",  auth, c.createCheckout);
router.post("/cancel",           auth, c.cancelSubscription);
router.get("/status",            auth, c.getStatus);

module.exports = router;
