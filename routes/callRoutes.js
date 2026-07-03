const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");

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
