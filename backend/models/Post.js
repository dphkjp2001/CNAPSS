// backend/models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true, trim: true },
    content:   { type: String, required: true, trim: true },
    nickname:  { type: String, required: true },     // 화면 표시용
    email:     { type: String, required: true, index: true }, // 권한 확인/검색용
    thumbsUpUsers: { type: [String], default: [] },   // 👍 누른 유저 이메일

    // ✅ 학교 스코프 (대문자로 통일: SchoolContext가 "NYU" 등을 넘긴다면 그대로 사용)
    school: {
      type: String,
      required: true,
      enum: ["NYU", "COLUMBIA", "BOSTON"],
      index: true,
      set: (v) => String(v).toUpperCase().trim(), // 혹시 소문자/혼합으로 들어와도 정규화
    },
  },
  { timestamps: true } // createdAt / updatedAt 자동 관리
);

// 🔎 조회 최적화 인덱스
postSchema.index({ school: 1, createdAt: -1 });
postSchema.index(
  { school: 1, title: "text", content: "text" },
  { name: "post_text_search" }
);

module.exports = mongoose.model("Post", postSchema);

