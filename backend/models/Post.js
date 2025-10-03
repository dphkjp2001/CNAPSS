// backend/models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },

    // ✅ 이미지 URL 배열
    images: { type: [String], default: [] },

    nickname: { type: String, required: true }, // display
    email: { type: String, required: true },    // author identity
    thumbsUpUsers: { type: [String], default: [] },

    // ✅ School scope: always lowercase
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

// indices
postSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);



