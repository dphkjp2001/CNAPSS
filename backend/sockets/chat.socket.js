// backend/sockets/chat.socket.js
const jwt = require("jsonwebtoken");
const Conversation = require("../models/Conversation");
const {
  setUserSocket, removeUserSocket,
  emitToConversation
} = require("./realtime");

/**
 * 채팅용 소켓 이벤트 등록
 * - handshake.auth.token(JWT)로 인증
 * - school room 가입
 * - conversation:join / typing:start / typing:stop
 */
function registerChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next(new Error("No token"));
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user; // {_id,email,school,...}
      setUserSocket(user._id, socket.id);
      socket.join(user.school); // 학교 룸
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      removeUserSocket(socket.user._id);
    });

    // 특정 대화방 참여(우측 채팅창 열릴 때)
    socket.on("conversation:join", async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const convo = await Conversation.findById(conversationId).lean();
        if (!convo) return;
        const isMember = convo.participants.some(p => String(p.userId) === String(socket.user._id));
        if (!isMember || convo.school !== socket.user.school) return;
        socket.join(`conv:${conversationId}`);
      } catch {}
    });

    socket.on("typing:start", ({ conversationId }) => {
      if (conversationId) {
        emitToConversation(conversationId, "typing:start", { conversationId, from: socket.user._id });
      }
    });
    socket.on("typing:stop", ({ conversationId }) => {
      if (conversationId) {
        emitToConversation(conversationId, "typing:stop", { conversationId, from: socket.user._id });
      }
    });
  });
}

module.exports = { registerChatSocket };
