const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
// const premium = require("../middleware/premiumMiddleware");
const {
  generateToken, startStream, endStream, getLiveStreams, getStream, getRejoinToken,
  scheduleStream, getScheduledStreams, updateScheduledStream, cancelScheduledStream,
  inviteToStream, launchScheduledStream,
} = require("../controllers/streamController");

// Premium gate removed — all authenticated users can host/create streams
router.post("/token",          auth, generateToken);
router.post("/start",          auth, startStream);
router.post("/schedule",       auth, scheduleStream);
router.put("/:id/end",         auth, endStream);
router.put("/:id/schedule",    auth, updateScheduledStream);
router.delete("/:id/schedule", auth, cancelScheduledStream);
router.post("/:id/invite",     auth, inviteToStream);
router.post("/:id/launch",     auth, launchScheduledStream);
router.post("/:id/host-token", auth, getRejoinToken);

// Free: viewing streams is allowed
router.get("/scheduled", auth, getScheduledStreams);
router.get("/",                getLiveStreams);
router.get("/:id",             getStream);

module.exports = router;
