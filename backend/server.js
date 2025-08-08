

// // ✅ backend/server.js
// const mongoose = require("mongoose");
// const app = require("./app");
// const http = require("http");
// const { Server } = require("socket.io");

// const Message = require("./models/Message");
// const Conversation = require("./models/Conversation");

// if (process.env.NODE_ENV !== "production") {
//   require("dotenv").config();
// }

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });

// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log("✅ MongoDB 연결 성공"))
//   .catch(err => console.error("❌ MongoDB 연결 실패", err));

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

//       io.to(conversationId).emit("receiveMessage", {
//         _id: message._id,
//         sender,
//         content,
//         createdAt: message.createdAt,
//       });

//       const targetEmail = convo.buyer === sender ? convo.seller : convo.buyer;
//       io.emit("newConversation", {
//         targetEmail,
//         conversationId: convo._id,
//       });

//       // ✅ 미리보기 실시간 갱신용 emit
//       io.emit("conversationUpdated", {
//         conversationId: convo._id,
//         lastMessage: content,
//         updatedAt: convo.updatedAt,
//       });

//     } catch (err) {
//       console.error("❌ 메시지 저장 실패:", err);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("🔌 사용자 연결 종료:", socket.id);
//   });

//   socket.on("markAsRead", async ({ conversationId, email }) => {
//     try {
//       const unreadMessages = await Message.updateMany(
//         {
//           conversationId,
//           readBy: { $ne: email },
//           sender: { $ne: email }, // 내가 보낸 건 굳이 읽음 처리 안 해도 됨
//         },
//         { $addToSet: { readBy: email } } // 중복 방지
//       );
  
//       // ✅ 읽음 상태가 바뀌었다면, 해당 대화방 사용자에게 알림
//       io.to(conversationId).emit("readStatusUpdated", {
//         conversationId,
//         reader: email,
//       });
//     } catch (err) {
//       console.error("❌ 읽음 처리 실패:", err);
//     }
//   });


// });

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

// Create HTTP server and bind Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // TODO: lock this down with your frontend URL(s)
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// 👉 Make io available to Express routes (e.g., to emit notifications on comment create)
app.set("io", io);

// DB connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed", err));

// --- Socket Handlers ---
io.on("connection", (socket) => {
  console.log("🟢 socket connected:", socket.id);

  // Room join for 1:1 chat (conversation room)
  socket.on("join", ({ conversationId }) => {
    if (!conversationId) return;
    socket.join(String(conversationId));
    console.log(`🛏️ joined conversation room: ${conversationId}`);
  });

  /**
   * User-level rooms for notifications:
   * - Join by userId (recommended) and/or email (fallback for existing flows)
   *   This allows server routes (e.g., comments) to emit "notification:new" to a specific user.
   *   Client should call: socket.emit("auth:join", { userId, email })
   */
  socket.on("auth:join", ({ userId, email }) => {
    if (userId) {
      socket.join(String(userId));
      console.log(`👤 joined userId room: ${userId}`);
    }
    if (email) {
      const emailRoom = `email:${email}`;
      socket.join(emailRoom);
      console.log(`📧 joined email room: ${emailRoom}`);
    }
  });

  // Send message within a conversation
  socket.on("sendMessage", async ({ conversationId, sender, content }) => {
    console.log(`💬 message from ${sender}:`, content);

    try {
      // 1) persist message
      const message = new Message({
        conversationId,
        sender,
        content,
      });
      await message.save();

      // 2) update conversation preview
      const convo = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: content,
          updatedAt: new Date(),
        },
        { new: true }
      );

      // 3) broadcast to conversation room
      io.to(String(conversationId)).emit("receiveMessage", {
        _id: message._id,
        sender,
        content,
        createdAt: message.createdAt,
      });

      // 4) figure out target participant (based on your existing schema: buyer/seller are emails)
      const targetEmail = convo?.buyer === sender ? convo?.seller : convo?.buyer;

      // 5) notify inbox list refresh for the target participant (global listeners)
      io.emit("newConversation", {
        targetEmail,
        conversationId: convo._id,
      });

      // 6) live preview update for conversation list
      io.emit("conversationUpdated", {
        conversationId: convo._id,
        lastMessage: content,
        updatedAt: convo.updatedAt,
      });

      // 7) (Optional but useful) direct ping into target's email room for subtle badge/bell updates
      if (targetEmail) {
        io.to(`email:${targetEmail}`).emit("inbox:newMessage", {
          conversationId: convo._id,
          lastMessage: content,
          from: sender,
          at: convo.updatedAt,
        });
      }
    } catch (err) {
      console.error("❌ failed to save message:", err);
    }
  });

  // Mark messages as read in a conversation
  socket.on("markAsRead", async ({ conversationId, email }) => {
    try {
      await Message.updateMany(
        {
          conversationId,
        },
        {
          $addToSet: { readBy: email }, // safe even if already there
        }
      );

      // Notify conversation participants about read status change
      io.to(String(conversationId)).emit("readStatusUpdated", {
        conversationId,
        reader: email,
      });
    } catch (err) {
      console.error("❌ failed to mark as read:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected:", socket.id);
  });
});

// Server listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 server running: http://localhost:${PORT}`);
});
