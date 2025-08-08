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



// ✅ backend/server.js
const mongoose = require("mongoose");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch(err => console.error("❌ MongoDB 연결 실패", err));

io.on("connection", (socket) => {
  console.log("🟢 사용자 연결됨:", socket.id);

  socket.on("join", ({ conversationId }) => {
    socket.join(conversationId);
    console.log(`🛏️ Room joined: ${conversationId}`);
  });

  socket.on("sendMessage", async ({ conversationId, sender, content }) => {
    console.log(`💬 메시지 from ${sender}:`, content);
    
    try {
      const message = new Message({
        conversationId,
        sender,
        content,
      });
      await message.save();

      const convo = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: content,
          updatedAt: new Date(),
        },
        { new: true }
      );

      io.to(conversationId).emit("receiveMessage", {
        _id: message._id,
        sender,
        content,
        createdAt: message.createdAt,
      });

      const targetEmail = convo.buyer === sender ? convo.seller : convo.buyer;
      io.emit("newConversation", {
        targetEmail,
        conversationId: convo._id,
      });

      // ✅ 미리보기 실시간 갱신용 emit
      io.emit("conversationUpdated", {
        conversationId: convo._id,
        lastMessage: content,
        updatedAt: convo.updatedAt,
      });

    } catch (err) {
      console.error("❌ 메시지 저장 실패:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 사용자 연결 종료:", socket.id);
  });

  socket.on("markAsRead", async ({ conversationId, email }) => {
    try {
      const unreadMessages = await Message.updateMany(
        {
          conversationId,
          readBy: { $ne: email },
          sender: { $ne: email }, // 내가 보낸 건 굳이 읽음 처리 안 해도 됨
        },
        { $addToSet: { readBy: email } } // 중복 방지
      );
  
      // ✅ 읽음 상태가 바뀌었다면, 해당 대화방 사용자에게 알림
      io.to(conversationId).emit("readStatusUpdated", {
        conversationId,
        reader: email,
      });
    } catch (err) {
      console.error("❌ 읽음 처리 실패:", err);
    }
  });


});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
