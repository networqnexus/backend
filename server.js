require("dotenv").config();
const express = require("express"), cors = require("cors"), http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

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



const app = express(), server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET","POST"] } });
const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("user_online", (userId) => { onlineUsers.set(userId, socket.id); io.emit("online_users", Array.from(onlineUsers.keys())); });
  socket.on("send_message", (data) => { const r = onlineUsers.get(data.receiverId); if (r) io.to(r).emit("receive_message", data); });
  socket.on("typing", (data) => { const r = onlineUsers.get(data.receiverId); if (r) io.to(r).emit("typing", data); });
  socket.on("stop_typing", (data) => { const r = onlineUsers.get(data.receiverId); if (r) io.to(r).emit("stop_typing", data); });
  socket.on("disconnect", () => { onlineUsers.forEach((sid, uid) => { if (sid === socket.id) onlineUsers.delete(uid); }); io.emit("online_users", Array.from(onlineUsers.keys())); });
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
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

connectDB();

app.use("/api/auth",          authRoutes);
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
