require("dotenv").config();
const express = require("express"), cors = require("cors"), http = require("http");
const { Server }      = require("socket.io");
const helmet          = require("helmet");
const morgan          = require("morgan");
const compression     = require("compression");
const mongoSanitize   = require("express-mongo-sanitize");
const rateLimit       = require("express-rate-limit");
const connectDB       = require("./config/db");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 500,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const authRoutes         = require("./routes/authRoutes");
const postRoutes         = require("./routes/postRoutes");
const profileRoutes      = require("./routes/profileRoutes");
const networkRoutes      = require("./routes/networkRoutes");
const jobRoutes          = require("./routes/jobRoutes");
const messageRoutes      = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const searchRoutes       = require("./routes/searchRoutes");
const atsRoutes          = require("./routes/atsRoutes");
const crmRoutes          = require("./routes/crmRoutes");
const hrmsRoutes         = require("./routes/hrmsRoutes");
const analyticsRoutes    = require("./routes/analyticsRoutes");
const streamRoutes       = require("./routes/streamRoutes");
const contactRoutes      = require("./routes/contactRoutes");
const eventRoutes        = require("./routes/eventRoutes");
const storyRoutes        = require("./routes/storyRoutes");
const paymentRoutes      = require("./routes/paymentRoutes");
const projectRoutes      = require("./routes/projectRoutes");
const orgRoutes          = require("./routes/orgRoutes");
const callRoutes         = require("./routes/callRoutes");



const User = require("./models/User");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const app = express(), server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", methods: ["GET","POST"] },
  maxHttpBufferSize: 15 * 1024 * 1024, // base64 media messages (up to 10MB uploads) must fit in a single socket packet
});
const onlineUsers = new Map();
const hiddenUsers = new Set();
const activeCalls = new Map(); // callId -> { participants: Set<userId>, conversationParticipants, isGroup, isVideo, conversationId, callerId, startedAt, answeredAt, finalized }

const broadcastOnlineUsers = () => {
  const visible = Array.from(onlineUsers.keys()).filter(id => !hiddenUsers.has(id));
  io.emit("online_users", visible);
};

// Writes a call's outcome as a system Message (callInfo) once it truly ends, and pushes it in real
// time over the same receive_message/receive_group_message channels the chat UI already listens on —
// this is what gives the "Calls" tab and inline chat history their entries, no separate model needed.
const finalizeCall = async (callId, statusOverride) => {
  const call = activeCalls.get(callId);
  if (!call || call.finalized) return;
  call.finalized = true;
  activeCalls.delete(callId);
  const status = statusOverride || (call.answeredAt ? "answered" : "missed");
  const duration = call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0;
  try {
    let message;
    if (call.isGroup) {
      message = await Message.create({
        sender: call.callerId, conversation: call.conversationId, text: "",
        callInfo: { isVideo: call.isVideo, status, duration, caller: call.callerId },
      });
      await message.populate("sender", "name username avatarUrl");
      await message.populate("conversation", "name avatarUrl");
      io.to(`group:${call.conversationId}`).emit("receive_group_message", message);
    } else {
      message = await Message.create({
        sender: call.callerId, receiver: call.conversationId, text: "",
        callInfo: { isVideo: call.isVideo, status, duration, caller: call.callerId },
      });
      await message.populate("sender", "name username avatarUrl");
      await message.populate("receiver", "name username avatarUrl");
      [call.callerId, call.conversationId].forEach(uid => {
        const sid = onlineUsers.get(uid);
        if (sid) io.to(sid).emit("receive_message", message);
      });
    }
    console.log(`[call] logged ${callId} status=${status} duration=${duration}s`);
  } catch (err) {
    console.log(`[call] failed to log call ${callId}:`, err.message);
  }
};

io.on("connection", (socket) => {
  socket.on("user_online", async (userId) => {
    console.log(`[presence] user_online ${userId} (socket ${socket.id})`);
    onlineUsers.set(userId, socket.id);
    try {
      const u = await User.findById(userId).select("hideOnlineStatus");
      if (u?.hideOnlineStatus) hiddenUsers.add(userId);
      else hiddenUsers.delete(userId);
    } catch {}
    try {
      const groups = await Conversation.find({ participants: userId }).select("_id");
      groups.forEach(g => socket.join(`group:${g._id}`));
    } catch {}
    broadcastOnlineUsers();
  });

  socket.on("update_online_visibility", ({ hidden }) => {
    let userId = null;
    onlineUsers.forEach((sid, uid) => { if (sid === socket.id) userId = uid; });
    if (userId) {
      if (hidden) hiddenUsers.add(userId);
      else hiddenUsers.delete(userId);
      broadcastOnlineUsers();
    }
  });

  socket.on("send_message", (data) => {
    const r = onlineUsers.get(data.receiverId);
    const sizeKb = Math.round(JSON.stringify(data).length / 1024);
    console.log(`[msg] send_message ${data.senderId} -> ${data.receiverId}, ${sizeKb}KB (${r ? "delivered" : "receiver NOT in onlineUsers"})`);
    if (r) io.to(r).emit("receive_message", data);
  });
  socket.on("typing", (data) => { const r = onlineUsers.get(data.receiverId); if (r) io.to(r).emit("typing", data); });
  socket.on("stop_typing", (data) => { const r = onlineUsers.get(data.receiverId); if (r) io.to(r).emit("stop_typing", data); });

  // Group messaging — participants share a room instead of a single receiver socket
  socket.on("join_group", (conversationId) => { socket.join(`group:${conversationId}`); });
  socket.on("send_group_message", (data) => {
    const room = `group:${data.conversation}`;
    const size = io.sockets.adapter.rooms.get(room)?.size || 0;
    console.log(`[msg] send_group_message to ${room} (${size} other socket(s) in room)`);
    socket.to(room).emit("receive_group_message", data);
  });
  socket.on("group_typing", (data) => { socket.to(`group:${data.conversationId}`).emit("group_typing", data); });
  socket.on("group_stop_typing", (data) => { socket.to(`group:${data.conversationId}`).emit("group_stop_typing", data); });

  // --- Voice/video calling (WebRTC signaling relay; call membership tracked in-memory only) ---
  socket.on("call_invite", (data) => {
    // data: { callId, conversationId, isGroup, isVideo, participantIds, from:{id,name,avatarUrl} }
    console.log(`[call] invite ${data.callId} from=${data.from.id} to=[${data.participantIds.filter(id => id !== data.from.id).join(",")}]`);
    activeCalls.set(data.callId, {
      participants: new Set([data.from.id]),
      conversationParticipants: data.participantIds,
      isGroup: data.isGroup,
      isVideo: data.isVideo,
      conversationId: data.conversationId,
      callerId: data.from.id,
      startedAt: Date.now(),
      answeredAt: null,
      finalized: false,
    });
    data.participantIds.forEach(uid => {
      if (uid === data.from.id) return;
      const sid = onlineUsers.get(uid);
      if (sid) {
        console.log(`[call] -> incoming_call delivered to ${uid} (socket ${sid})`);
        io.to(sid).emit("incoming_call", data);
      } else {
        console.log(`[call] !! ${uid} is not online, incoming_call NOT delivered`);
      }
    });
  });

  socket.on("call_join", (data) => {
    // data: { callId, userId, name, avatarUrl }
    console.log(`[call] join ${data.callId} userId=${data.userId}`);
    const call = activeCalls.get(data.callId);
    if (!call) { console.log(`[call] !! join failed, unknown callId ${data.callId}`); return; }
    if (!call.answeredAt) call.answeredAt = Date.now();
    const roster = Array.from(call.participants).filter(id => id !== data.userId);
    const joinerSid = onlineUsers.get(data.userId);
    console.log(`[call] roster for ${data.userId}: [${roster.join(",")}]`);
    if (joinerSid) io.to(joinerSid).emit("call_roster", { callId: data.callId, roster });
    call.participants.add(data.userId);
    call.conversationParticipants.forEach(uid => {
      if (uid === data.userId) return;
      const sid = onlineUsers.get(uid);
      if (sid) io.to(sid).emit("call_participant_joined", { callId: data.callId, userId: data.userId, name: data.name, avatarUrl: data.avatarUrl });
    });
  });

  socket.on("call_reject", (data) => {
    // data: { callId, to, from }
    console.log(`[call] reject ${data.callId} from=${data.from} to=${data.to}`);
    const sid = onlineUsers.get(data.to);
    if (sid) io.to(sid).emit("call_rejected", data);
    const call = activeCalls.get(data.callId);
    if (call && !call.isGroup) finalizeCall(data.callId, "declined");
  });

  socket.on("call_leave", (data) => {
    // data: { callId, userId }
    console.log(`[call] leave ${data.callId} userId=${data.userId}`);
    const call = activeCalls.get(data.callId);
    if (call) {
      call.participants.delete(data.userId);
      call.conversationParticipants.forEach(uid => {
        if (uid === data.userId) return;
        const sid = onlineUsers.get(uid);
        if (sid) io.to(sid).emit("call_participant_left", { callId: data.callId, userId: data.userId });
      });
      if (call.participants.size === 0) { console.log(`[call] ${data.callId} ended (no participants left)`); finalizeCall(data.callId); }
    }
  });

  socket.on("webrtc_offer", (data) => {
    const sid = onlineUsers.get(data.to);
    console.log(`[webrtc] offer ${data.from} -> ${data.to} (${sid ? "delivered" : "target offline"})`);
    if (sid) io.to(sid).emit("webrtc_offer", data);
  });
  socket.on("webrtc_answer", (data) => {
    const sid = onlineUsers.get(data.to);
    console.log(`[webrtc] answer ${data.from} -> ${data.to} (${sid ? "delivered" : "target offline"})`);
    if (sid) io.to(sid).emit("webrtc_answer", data);
  });
  socket.on("webrtc_ice_candidate", (data) => { const sid = onlineUsers.get(data.to); if (sid) io.to(sid).emit("webrtc_ice_candidate", data); });

  socket.on("disconnect", async () => {
    let disconnectedId = null;
    onlineUsers.forEach((sid, uid) => { if (sid === socket.id) disconnectedId = uid; });
    if (disconnectedId) {
      onlineUsers.delete(disconnectedId);
      hiddenUsers.delete(disconnectedId);
      activeCalls.forEach((call, callId) => {
        if (!call.participants.has(disconnectedId)) return;
        call.participants.delete(disconnectedId);
        call.conversationParticipants.forEach(uid => {
          const sid = onlineUsers.get(uid);
          if (sid) io.to(sid).emit("call_participant_left", { callId, userId: disconnectedId });
        });
        if (call.participants.size === 0) finalizeCall(callId);
      });
      try { await User.findByIdAndUpdate(disconnectedId, { lastSeen: new Date() }); } catch {}
    }
    broadcastOnlineUsers();
  });

  socket.on("join_stream", (streamId) => {
    socket.join(`stream:${streamId}`);
    const count = io.sockets.adapter.rooms.get(`stream:${streamId}`)?.size || 0;
    io.to(`stream:${streamId}`).emit("viewer_count", { count });
  });
  socket.on("leave_stream", (streamId) => {
    socket.leave(`stream:${streamId}`);
    const count = io.sockets.adapter.rooms.get(`stream:${streamId}`)?.size || 0;
    io.to(`stream:${streamId}`).emit("viewer_count", { count });
  });
  socket.on("stream_chat", (data) => {
    io.to(`stream:${data.streamId}`).emit("stream_chat", data);
  });
});

app.use((req, res, next) => { req.io = io; req.onlineUsers = onlineUsers; next(); });
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan("dev"));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));

// Stripe webhook must receive raw body — register BEFORE express.json()
const { webhook } = require("./controllers/paymentController");
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), webhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());
app.use(generalLimiter);

connectDB();

app.use("/api/auth",          authLimiter, authRoutes);
app.use("/api/posts",         postRoutes);
app.use("/api/profile",       profileRoutes);
app.use("/api/network",       networkRoutes);
app.use("/api/jobs",          jobRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search",        searchRoutes);
app.use("/api/ats",           atsRoutes);
app.use("/api/crm",           crmRoutes);
app.use("/api/hrms",          hrmsRoutes);
app.use("/api/analytics",     analyticsRoutes);
app.use("/api/streams",  streamRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/events",  eventRoutes);
app.use("/api/stories",  storyRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/organizations", orgRoutes);
app.use("/api/calls",        callRoutes);

app.get("/", (req, res) => res.json({ success: true, message: "Networq Nexus API 🚀" }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\n=======================");
  console.log("🚀 Networq Nexus API");
  console.log("🌐 PORT : " + PORT);
  console.log("🔌 Socket.io : Ready");
  console.log("✅ All Routes : Loaded");
  console.log("=======================\n");
});
