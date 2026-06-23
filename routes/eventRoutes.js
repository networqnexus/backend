const express = require("express"), router = express.Router();
const auth = require("../middleware/authMiddleware");
const c = require("../controllers/eventController");

router.get("/",        auth, c.getEvents);
router.get("/past",    auth, c.getPastEvents);
router.get("/mine",    auth, c.getMyEvents);
router.post("/",       auth, c.createEvent);
router.put("/:id/attend", auth, c.toggleAttend);
router.delete("/:id",  auth, c.deleteEvent);

module.exports = router;
