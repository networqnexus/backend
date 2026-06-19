const { AccessToken } = require("livekit-server-sdk");
const { randomUUID } = require("crypto");
const Stream = require("../models/Stream");
const Notification = require("../models/Notification");

const buildToken = async (identity, roomName, canPublish) => {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    ttl: "4h",
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish, canSubscribe: true, canPublishData: true });
  return at.toJwt();
};

// POST /api/streams/token
const generateToken = async (req, res) => {
  try {
    const { roomName } = req.body;
    const token = await buildToken(req.user.id, roomName, false);
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams/start
const startStream = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const roomName = `stream-${randomUUID()}`;
    const stream = await Stream.create({
      title, description, category,
      host: req.user.id,
      roomName,
      status: "live",
      startedAt: new Date(),
    });
    const token = await buildToken(req.user.id, roomName, true);
    req.io?.emit("stream_started", { streamId: stream._id });
    res.json({ success: true, stream, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams/schedule
const scheduleStream = async (req, res) => {
  try {
    const { title, description, category, scheduledAt, isPublic, invitedUserIds = [] } = req.body;
    if (!scheduledAt)
      return res.status(400).json({ success: false, message: "Scheduled time is required" });
    if (new Date(scheduledAt) <= new Date())
      return res.status(400).json({ success: false, message: "Scheduled time must be in the future" });

    const stream = await Stream.create({
      title, description, category,
      host: req.user.id,
      status: "scheduled",
      isPublic: isPublic !== false,
      invitedUsers: invitedUserIds,
      scheduledAt: new Date(scheduledAt),
    });

    if (invitedUserIds.length > 0) {
      const notifDocs = invitedUserIds.map(uid => ({
        recipient: uid,
        sender: req.user.id,
        type: "stream_invite",
        message: `You've been invited to a stream: "${title}"`,
        link: "/streaming",
      }));
      await Notification.insertMany(notifDocs);
      notifDocs.forEach(n => req.io?.to(String(n.recipient)).emit("new_notification", n));
    }

    const populated = await stream.populate("host", "name avatarUrl headline");
    res.json({ success: true, stream: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/streams/scheduled
const getScheduledStreams = async (req, res) => {
  try {
    const userId = req.user.id;
    const streams = await Stream.find({
      status: "scheduled",
      scheduledAt: { $gte: new Date() },
      $or: [{ isPublic: true }, { host: userId }, { invitedUsers: userId }],
    })
      .populate("host", "name avatarUrl headline")
      .populate("invitedUsers", "name avatarUrl headline")
      .sort({ scheduledAt: 1 });
    res.json({ success: true, streams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/streams/:id/schedule
const updateScheduledStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ _id: req.params.id, host: req.user.id, status: "scheduled" });
    if (!stream) return res.status(404).json({ success: false, message: "Scheduled stream not found" });

    const { title, description, category, scheduledAt, isPublic } = req.body;
    if (title)                stream.title       = title;
    if (description !== undefined) stream.description = description;
    if (category)             stream.category    = category;
    if (scheduledAt) {
      if (new Date(scheduledAt) <= new Date())
        return res.status(400).json({ success: false, message: "Scheduled time must be in the future" });
      stream.scheduledAt = new Date(scheduledAt);
    }
    if (isPublic !== undefined) stream.isPublic = isPublic;
    await stream.save();

    const populated = await stream.populate("host", "name avatarUrl headline");
    res.json({ success: true, stream: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/streams/:id/schedule
const cancelScheduledStream = async (req, res) => {
  try {
    const stream = await Stream.findOneAndDelete({ _id: req.params.id, host: req.user.id, status: "scheduled" });
    if (!stream) return res.status(404).json({ success: false, message: "Scheduled stream not found" });
    res.json({ success: true, message: "Stream cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams/:id/invite
const inviteToStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ _id: req.params.id, host: req.user.id, status: "scheduled" });
    if (!stream) return res.status(404).json({ success: false, message: "Scheduled stream not found" });

    const { userIds = [] } = req.body;
    const existing = stream.invitedUsers.map(String);
    const newUsers = userIds.filter(id => !existing.includes(String(id)));
    stream.invitedUsers.push(...newUsers);
    await stream.save();

    if (newUsers.length > 0) {
      const notifDocs = newUsers.map(uid => ({
        recipient: uid,
        sender: req.user.id,
        type: "stream_invite",
        message: `You've been invited to a stream: "${stream.title}"`,
        link: "/streaming",
      }));
      await Notification.insertMany(notifDocs);
      notifDocs.forEach(n => req.io?.to(String(n.recipient)).emit("new_notification", n));
    }

    const populated = await stream.populate("invitedUsers", "name avatarUrl headline");
    res.json({ success: true, stream: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams/:id/launch
const launchScheduledStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ _id: req.params.id, host: req.user.id, status: "scheduled" });
    if (!stream) return res.status(404).json({ success: false, message: "Scheduled stream not found" });

    const roomName = `stream-${randomUUID()}`;
    stream.roomName  = roomName;
    stream.status    = "live";
    stream.startedAt = new Date();
    await stream.save();

    const token = await buildToken(req.user.id, roomName, true);
    req.io?.emit("stream_started", { streamId: stream._id });
    res.json({ success: true, stream, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/streams/:id/end
const endStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ _id: req.params.id, host: req.user.id, status: "live" });
    if (!stream) return res.status(404).json({ success: false, message: "Stream not found" });
    stream.status = "ended";
    stream.endedAt = new Date();
    await stream.save();
    req.io?.emit("stream_ended", { streamId: stream._id });
    res.json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/streams
const getLiveStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ status: "live" })
      .populate("host", "name avatarUrl headline")
      .sort({ startedAt: -1 });
    res.json({ success: true, streams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/streams/:id
const getStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate("host", "name avatarUrl headline");
    if (!stream) return res.status(404).json({ success: false, message: "Stream not found" });
    res.json({ success: true, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/streams/:id/host-token
const getRejoinToken = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return res.status(404).json({ success: false, message: "Stream not found" });
    if (String(stream.host) !== String(req.user.id))
      return res.status(403).json({ success: false, message: "You are not the host" });
    if (stream.status === "ended")
      return res.status(400).json({ success: false, message: "Stream has ended" });
    const token = await buildToken(req.user.id, stream.roomName, true);
    res.json({ success: true, token, stream });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  generateToken, startStream, endStream, getLiveStreams, getStream, getRejoinToken,
  scheduleStream, getScheduledStreams, updateScheduledStream, cancelScheduledStream,
  inviteToStream, launchScheduledStream,
};
