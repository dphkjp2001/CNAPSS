// // backend/models/Message
// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//   {
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: "Conversation",
//     },
//     sender: { type: String, required: true }, // 이메일
//     content: { type: String, required: true },

//     // ✅ 읽은 사용자 목록
//     readBy: {
//       type: [String], // 이메일 배열
//       default: [],
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Message", messageSchema);

// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Conversation",
      index: true,
    },
    sender: { type: String, required: true, lowercase: true }, // email
    content: { type: String, required: true, trim: true },

    readBy: { type: [String], default: [] }, // emails (lowercase)

    // ✅ duplicate school for filtering/guard
    school: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["nyu", "columbia", "boston"],
      index: true,
    },
  },
  { timestamps: true }
);

messageSchema.index({ school: 1, conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
