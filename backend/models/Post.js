// backend/models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },

  nickname: { type: String, required: true }, // 화면 표시용
  email: { type: String, required: true },    // 권한 확인용
  thumbsUpUsers: { type: [String], default: [] },

  // ✅ 학교 스코프
  school: {
    type: String,
    required: true,
    enum: ["NYU", "COLUMBIA", "BOSTON"],
    index: true,
  },

  createdAt: { type: Date, default: Date.now },
});

// ✅ 올바른 변수명으로 인덱스 설정
postSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);


