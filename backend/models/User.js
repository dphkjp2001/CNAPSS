// 📁 파일 경로: backend/models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
    password: { type: String, required: true },

    // ✅ 이메일 인증 여부 (링크 클릭 기반)
    isVerified: { type: Boolean, default: false },

    // 친구 기능 관련
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
