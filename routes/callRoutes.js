const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// All logged calls (1:1 + group) involving the current user, newest first — powers the Calls tab.
router.get("/history", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await Conversation.find({ participants: userId }).select("_id");
    const calls = await Message.find({
      callInfo: { $exists: true },
      $or: [
        { sender: userId },
        { receiver: userId },
        { conversation: { $in: groups.map(g => g._id) } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sender", "name username avatarUrl")
      .populate("receiver", "name username avatarUrl")
      .populate("conversation", "name avatarUrl");
    res.json({ success: true, calls });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Returns ICE server config (STUN + TURN) for WebRTC calls.
// Supports Metered.ca free API (50GB/month) via env vars:
//   METERED_API_KEY   — from metered.ca dashboard
//   METERED_APP_NAME  — your app name (e.g. "mynexus" → mynexus.metered.live)
// Falls back to reliable public STUN + OpenRelay TURN if no API key set.
router.get("/ice-servers", auth, async (req, res) => {
  try {
    if (process.env.METERED_API_KEY && process.env.METERED_APP_NAME) {
      const url = `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const iceServers = await resp.json();
        return res.json({ success: true, iceServers });
      }
    }

    // Fallback: multiple public STUN + OpenRelay TURN
    res.json({
      success: true,
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:openrelay.metered.ca:80" },
        { urls: "turn:openrelay.metered.ca:80",                   username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443",                  username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp",    username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:80?transport=tcp",     username: "openrelayproject", credential: "openrelayproject" },
      ],
    });
  } catch {
    res.json({
      success: true,
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:443",               username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
      ],
    });
  }
});

module.exports = router;
