// backend/models/Comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post" },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    content: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // ✅ 추가
    

    thumbsUp: { type: Number, default: 0 },
    thumbsUpUsers: [{ type: String, default: [] }], // ✅ 필수!, // email 목록 저장

  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
