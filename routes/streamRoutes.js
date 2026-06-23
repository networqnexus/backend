const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const premium = require("../middleware/premiumMiddleware");
const {
  generateToken, startStream, endStream, getLiveStreams, getStream, getRejoinToken,
  scheduleStream, getScheduledStreams, updateScheduledStream, cancelScheduledStream,
  inviteToStream, launchScheduledStream,
} = require("../controllers/streamController");

// Premium-only: hosting/creating streams
router.post("/token",          auth, premium, generateToken);
router.post("/start",          auth, premium, startStream);
router.post("/schedule",       auth, premium, scheduleStream);
router.put("/:id/end",         auth, premium, endStream);
router.put("/:id/schedule",    auth, premium, updateScheduledStream);
router.delete("/:id/schedule", auth, premium, cancelScheduledStream);
router.post("/:id/invite",     auth, premium, inviteToStream);
router.post("/:id/launch",     auth, premium, launchScheduledStream);
router.post("/:id/host-token", auth, premium, getRejoinToken);

// Free: viewing streams is allowed
router.get("/scheduled", auth, getScheduledStreams);
router.get("/",                getLiveStreams);
router.get("/:id",             getStream);

module.exports = router;
