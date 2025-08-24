//backend/server.js
// const mongoose = require("mongoose");
// const app = require("./app");
// const http = require("http");
// const { Server } = require("socket.io");

// // ✅ 모델 import
// const Message = require("./models/Message");
// const Conversation = require("./models/Conversation");

// // ✅ .env 로딩
// if (process.env.NODE_ENV !== "production") {
//   require("dotenv").config();
// }

// // ✅ HTTP 서버로 감싼 뒤 Socket.io 서버 초기화
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*", // 또는 ["https://cnapss.com", ...] 처럼 명시
//     methods: ["GET", "POST"],
//   },
// });

// // ✅ MongoDB 연결
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log("✅ MongoDB 연결 성공"))
//   .catch(err => console.error("❌ MongoDB 연결 실패", err));

// // ✅ Socket.io 실시간 처리
// io.on("connection", (socket) => {
//   console.log("🟢 사용자 연결됨:", socket.id);

//   socket.on("join", ({ conversationId }) => {
//     socket.join(conversationId);
//     console.log(`🛏️ Room joined: ${conversationId}`);
//   });

//   socket.on("sendMessage", async ({ conversationId, sender, content }) => {
//     console.log(`💬 메시지 from ${sender}:`, content);

//     try {
//       const message = new Message({
//         conversationId,
//         sender,
//         content,
//       });
//       await message.save();

//       const convo = await Conversation.findByIdAndUpdate(
//         conversationId,
//         {
//           lastMessage: content,
//           updatedAt: new Date(),
//         },
//         { new: true }
//       );

//       // ✅ 실시간 메시지 전달
//       io.to(conversationId).emit("receiveMessage", {
//         sender,
//         content,
//         createdAt: message.createdAt,
//       });

//       // ✅ 실시간 미리보기 업데이트
//       io.emit("conversationUpdated", {
//         conversationId: convo._id,
//         lastMessage: content,
//       });

//     } catch (err) {
//       console.error("❌ 메시지 저장 실패:", err);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("🔌 사용자 연결 종료:", socket.id);
//   });
// });


// // ✅ 서버 실행
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
// });



// backend/server.js
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const server = http.createServer(app);

// 🔧 소켓 CORS (필요 시 도메인 화이트리스트로 좁혀도 됨)
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

// 🧩 Mongo 연결
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connect failed", err));

// 🔐 소켓 인증 (JWT)
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
    return next();
  } catch (e) {
    return next(new Error("UNAUTHORIZED"));
  }
});

// 🔎 권한 체크 helper
async function authorizeConversation(conversationId, email, school) {
  if (!conversationId) return { ok: false };
  const convo = await Conversation.findById(conversationId);
  if (!convo) return { ok: false };
  const isParticipant = [convo.buyer, convo.seller].includes(email);
  if (!isParticipant) return { ok: false };
  if (convo.school !== school) return { ok: false };
  return { ok: true, convo };
}

io.on("connection", (socket) => {
  const { email, school } = socket.user;
  console.log("🟢 socket connected:", email, school);

  // 글로벌 룸
  socket.join(`school:${school}`);
  socket.join(`user:${email}`);

  // 대화방 입장
  socket.on("chat:join", async ({ conversationId }) => {
    const auth = await authorizeConversation(conversationId, email, school);
    if (!auth.ok) return;
    socket.join(`conv:${conversationId}`);
  });

  // 메시지 발신
  socket.on("chat:send", async ({ conversationId, content }) => {
    try {
      const auth = await authorizeConversation(conversationId, email, school);
      if (!auth.ok) return;

      const msg = await Message.create({
        conversationId,
        sender: email,
        content,
        school,
      });

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
    } catch (err) {
      console.error("❌ chat:send error", err);
    }
  });

  // 읽음 처리
  socket.on("chat:read", async ({ conversationId }) => {
    try {
      const auth = await authorizeConversation(conversationId, email, school);
      if (!auth.ok) return;

      await Message.updateMany(
        { conversationId, readBy: { $ne: email }, sender: { $ne: email } },
        { $addToSet: { readBy: email } }
      );
      io.to(`conv:${conversationId}`).emit("chat:read:updated", { conversationId, reader: email });
    } catch (err) {
      console.error("❌ chat:read error", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected:", email);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
