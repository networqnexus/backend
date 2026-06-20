const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const { submitContact } = require("../controllers/contactController");

router.post("/", auth, submitContact);

module.exports = router;
