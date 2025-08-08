// backend/models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  nickname: { type: String, required: true }, // 화면 표시용
  email: { type: String, required: true },    // 🔥 권한 확인용 ← 이게 없으면 안 됩니다!
  thumbsUpUsers: { type: [String], default: [] }, // 👍 추천 유저 목록 추가
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Post", postSchema);
