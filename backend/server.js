// // backend/server.js
// const app = require("./app");
// const http = require("http");
// const { Server } = require("socket.io");
// const jwt = require("jsonwebtoken");
// const mongoose = require("mongoose");

// const Conversation = require("./models/Conversation");
// const Message = require("./models/Message");
// const Post = require("./models/Post"); // ✅ 댓글 룸 join 체크에 사용

// if (process.env.NODE_ENV !== "production") {
//   require("dotenv").config();
// }

// const server = http.createServer(app);

// // 🔧 소켓 CORS
// const io = new Server(server, {
//   cors: {
//     origin: [
//       "https://www.cnapss.com",
//       "https://cnapss.com",
//       "https://cnapss-3da82.web.app",
//       "http://localhost:3000",
//       "http://localhost:5173",
//     ],
//     methods: ["GET", "POST"],
//   },
// });

// // 👉 라우터에서 io 접근할 수 있게 주입
// app.set("io", io);

// // 🧩 Mongo
// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connect failed", err));

// // 🔐 소켓 인증 (JWT)
// io.use((socket, next) => {
//   try {
//     const token =
//       socket.handshake.auth?.token ||
//       socket.handshake.query?.token ||
//       (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
//     if (!token) return next(new Error("UNAUTHORIZED"));
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     socket.user = {
//       id: decoded.id,
//       email: decoded.email,
//       school: decoded.school,
//       role: decoded.role || "user",
//     };
//     return next();
//   } catch (e) {
//     return next(new Error("UNAUTHORIZED"));
//   }
// });

// // 🔎 대화방 권한 체크
// async function authorizeConversation(conversationId, email, school) {
//   if (!conversationId) return { ok: false };
//   const convo = await Conversation.findById(conversationId);
//   if (!convo) return { ok: false };
//   const isParticipant = [convo.buyer, convo.seller].includes(email);
//   if (!isParticipant) return { ok: false };
//   if (convo.school !== school) return { ok: false };
//   return { ok: true, convo };
// }

// io.on("connection", (socket) => {
//   const { email, school } = socket.user;
//   console.log("🟢 socket connected:", email, school);

//   // 글로벌 룸
//   socket.join(`school:${school}`);
//   socket.join(`user:${email}`);

//   /* ============================
//    *   💬 채팅 이벤트 (기존)
//    * ============================ */
//   socket.on("chat:join", async ({ conversationId }) => {
//     const auth = await authorizeConversation(conversationId, email, school);
//     if (!auth.ok) return;
//     socket.join(`conv:${conversationId}`);
//   });

//   socket.on("chat:send", async ({ conversationId, content }) => {
//     try {
//       const auth = await authorizeConversation(conversationId, email, school);
//       if (!auth.ok) return;

//       const msg = await Message.create({
//         conversationId,
//         sender: email,
//         content,
//         school,
//       });

//       auth.convo.lastMessage = content;
//       auth.convo.updatedAt = new Date();
//       await auth.convo.save();

//       io.to(`conv:${conversationId}`).emit("chat:receive", {
//         _id: msg._id,
//         conversationId,
//         sender: email,
//         content,
//         createdAt: msg.createdAt,
//       });

//       const peer = auth.convo.buyer === email ? auth.convo.seller : auth.convo.buyer;
//       io.to(`user:${peer}`).emit("chat:preview", {
//         conversationId,
//         lastMessage: content,
//         updatedAt: auth.convo.updatedAt,
//       });
//     } catch (err) {
//       console.error("❌ chat:send error", err);
//     }
//   });

//   socket.on("chat:read", async ({ conversationId }) => {
//     try {
//       const auth = await authorizeConversation(conversationId, email, school);
//       if (!auth.ok) return;

//       await Message.updateMany(
//         { conversationId, readBy: { $ne: email }, sender: { $ne: email } },
//         { $addToSet: { readBy: email } }
//       );
//       io.to(`conv:${conversationId}`).emit("chat:read:updated", { conversationId, reader: email });
//     } catch (err) {
//       console.error("❌ chat:read error", err);
//     }
//   });

//   /* ============================
//    *   📝 댓글 실시간 (신규)
//    * ============================ */
//   socket.on("post:join", async ({ postId }) => {
//     try {
//       if (!postId) return;
//       const post = await Post.findById(postId).select("school").lean();
//       if (!post || post.school !== school) return;
//       socket.join(`post:${postId}`);
//     } catch (e) {
//       console.error("post:join error", e);
//     }
//   });

//   socket.on("post:leave", ({ postId }) => {
//     try {
//       if (!postId) return;
//       socket.leave(`post:${postId}`);
//     } catch (_) {}
//   });

//   socket.on("disconnect", () => {
//     console.log("🔌 socket disconnected:", email);
//   });
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server listening on http://localhost:${PORT}`);
// });



// 인증 소켓 + 채팅/댓글 실시간 핸들링 (app.set('io') 주입 포함)
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Post = require("./models/Post");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://www.cnapss.com",
      "https://cnapss.com",
      "https://cnapss-3da82.web.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
  },
});
app.set("io", io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connect failed", err));

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return next(new Error("UNAUTHORIZED"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, email: decoded.email, school: decoded.school, role: decoded.role || "user" };
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

  // 댓글 실시간: 필요 시 freeboard 상세에서 post:join/leave 사용
  socket.on("post:join", async ({ postId }) => {
    if (!postId) return;
    const post = await Post.findById(postId).select("school").lean();
    if (!post || post.school !== school) return;
    socket.join(`post:${postId}`);
  });
  socket.on("post:leave", ({ postId }) => postId && socket.leave(`post:${postId}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
