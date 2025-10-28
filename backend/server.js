// backend/server.js
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Post = require("./models/Post");
// ⚠️ const CareerPost = require("./models/CareerPost");  // 사용 안 함. 아래에서 참조 제거
const Request = require("./models/Request");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const server = http.createServer(app);

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    origin: [
      "https://www.cnapss.com",
      "https://cnapss.com",
      "https://api.cnapss.com",
      "https://cnapss-3da82.web.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});
app.set("io", io);

// Mongo
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connect failed", err));

// 인덱스 마이그레이션
mongoose.connection.once("open", async () => {
  try {
    await Request.ensureIndexesUpToDate();
    console.log("[Request] indexes are up-to-date");
  } catch (e) {
    console.error("[Request] ensureIndexesUpToDate failed:", e);
  }
});

// 소켓 인증
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return next(new Error("UNAUTHORIZED"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      school: decoded.school,
      role: decoded.role || "user",
    };
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));
  }
});


async function authorizeConversation(conversationId, email, school) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) return { ok: false };
  const isParticipant = [convo.buyer, convo.seller].includes(email);
  if (!isParticipant || convo.school !== school) return { ok: false };
  return { ok: true, convo };
}

io.on("connection", (socket) => {
  const { email, school } = socket.user;
  socket.join(`school:${school}`);
  socket.join(`user:${email}`);

  socket.on("chat:join", async ({ conversationId }) => {
    const auth = await authorizeConversation(conversationId, email, school);
    if (!auth.ok) return;
    socket.join(`conv:${conversationId}`);
  });

  socket.on("chat:send", async ({ conversationId, content }) => {
    try {
      const auth = await authorizeConversation(conversationId, email, school);
      if (!auth.ok) return;
      const msg = await Message.create({ conversationId, sender: email, content, school });
      auth.convo.lastMessage = content;
      auth.convo.updatedAt = new Date();
      await auth.convo.save();

      io.to(`conv:${conversationId}`).emit("chat:receive", {
        _id: msg._id,
        conversationId,
        sender: email,
        content,
        createdAt: msg.createdAt,
      });

      const peer = auth.convo.buyer === email ? auth.convo.seller : auth.convo.buyer;
      io.to(`user:${peer}`).emit("chat:preview", {
        conversationId,
        lastMessage: content,
        updatedAt: auth.convo.updatedAt,
      });
    } catch (e) {
      console.error("chat:send error", e);
    }
  });

  socket.on("chat:read", async ({ conversationId }) => {
    try {
      const auth = await authorizeConversation(conversationId, email, school);
      if (!auth.ok) return;
      await Message.updateMany(
        { conversationId, readBy: { $ne: email }, sender: { $ne: email } },
        { $addToSet: { readBy: email } }
      );
      io.to(`conv:${conversationId}`).emit("chat:read:updated", { conversationId, reader: email });
    } catch (e) {
      console.error("chat:read error", e);
    }
  });

  // ✅ Freeboard + CareerBoard 모두 허용
  socket.on("post:join", async ({ postId }) => {
    try {
      if (!postId) return;

      // try both Post and CareerPost
      const [free, career] = await Promise.all([
        Post.findById(postId).select("school").lean(),
        CareerPost.findById(postId).select("school").lean(),
      ]);
      const schoolOf = free?.school || career?.school;

      if (!schoolOf || schoolOf !== school) return; // tenant guard
      socket.join(`post:${postId}`);
    } catch (e) {
      console.error("post:join error", e);
    }
  });

  socket.on("post:leave", ({ postId }) => postId && socket.leave(`post:${postId}`));

  // ✅ Post detail room join (Freeboard/Academic 공통)
  socket.on("post:join", async ({ postId }) => {
    try {
      if (!postId) return;

      const free = await Post.findById(postId).select("school").lean();
      const schoolOf = free?.school;

      if (!schoolOf || schoolOf !== school) return; // tenant guard
      socket.join(`post:${postId}`);
    } catch (e) {
      console.error("post:join error", e);
    }
  });

  socket.on("post:leave", ({ postId }) => postId && socket.leave(`post:${postId}`));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));


