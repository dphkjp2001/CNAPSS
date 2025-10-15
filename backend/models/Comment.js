// // backend/models/Comment.js
// const mongoose = require("mongoose");

// const commentSchema = new mongoose.Schema(
//   {
//     postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post", index: true },
//     email: { type: String, required: true, index: true },
//     nickname: { type: String, required: true },
//     content: { type: String, required: true },
//     parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
//     readBy: { type: [String], default: [] },

//     thumbsUp: { type: Number, default: 0 },
//     // ✅ 배열 스키마 보정
//     thumbsUpUsers: { type: [String], default: [] }, // email list

//     // ✅ 테넌시 스코프
//     school: {
//       type: String,
//       required: true,
//       lowercase: true,
//       enum: ["nyu", "columbia", "boston"],
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// // 성능 인덱스
// commentSchema.index({ school: 1, createdAt: -1 });
// commentSchema.index({ postId: 1, school: 1, createdAt: -1 });

// module.exports = mongoose.model("Comment", commentSchema);



// backend/models/Comment.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },

    // 🔐 멀티테넌시
    school: { type: String, required: true, index: true },

    // 작성자 정보
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, index: true },
    nickname: { type: String },

    // 내용
    content: { type: String, required: true },

    // ✅ 대댓글(부모 코멘트)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    // Voting
    counts: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 }
    },
    hotScore: { type: Number, default: 0, index: true },

    // Legacy: To be deprecated
    thumbsUpUsers: { type: [String], default: [] },
  },
  { timestamps: true }
);

// 조회 정렬용 복합 인덱스
CommentSchema.index({ postId: 1, school: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", CommentSchema);

