// // backend/models/Comment.js
// const mongoose = require("mongoose");

// const commentSchema = new mongoose.Schema(
//   {
//     postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post" },
//     email: { type: String, required: true },
//     nickname: { type: String, required: true },
//     content: { type: String, required: true },
//     parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // ✅ 추가
//     readBy: { type: [String], default: [] },  // 내가 읽었는가가 핵심

//     thumbsUp: { type: Number, default: 0 },
//     thumbsUpUsers: [{ type: String, default: [] }], // ✅ 필수!, // email 목록 저장

//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Comment", commentSchema);


// backend/models/Comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post", index: true },
    email: { type: String, required: true, index: true },
    nickname: { type: String, required: true },
    content: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    readBy: { type: [String], default: [] },

    thumbsUp: { type: Number, default: 0 },
    // ✅ 배열 스키마 보정
    thumbsUpUsers: { type: [String], default: [] }, // email list

    // ✅ 테넌시 스코프
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

// 성능 인덱스
commentSchema.index({ school: 1, createdAt: -1 });
commentSchema.index({ postId: 1, school: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
