// backend/models/Message
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Conversation",
    },
    sender: { type: String, required: true }, // 이메일
    content: { type: String, required: true },

    // ✅ 읽은 사용자 목록
    readBy: {
      type: [String], // 이메일 배열
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);