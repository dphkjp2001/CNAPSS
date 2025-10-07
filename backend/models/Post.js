// backend/models/Post.js
const mongoose = require("mongoose");

const CountsSchema = new mongoose.Schema({
  up:   { type: Number, default: 0 },
  down: { type: Number, default: 0 }
}, { _id: false });

const PostSchema = new mongoose.Schema({
  school: { type: String, required: true, index: true },               // 멀티테넌시 강제
  board:  { type: String, enum: ["free","academic"], required: true, index: true },
  type:   { type: String, enum: ["general","looking"], default: "general", index: true }, // academic 전용
  title:  { type: String, required: true, trim: true },
  body:   { type: String, default: "" },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  anonymous: { type: Boolean, default: true },
  tags:   [{ type: String }],                                          // 선택
  counts: { type: CountsSchema, default: () => ({}) },
  commentCount: { type: Number, default: 0 }
}, { timestamps: true });

PostSchema.index({ school: 1, board: 1, createdAt: -1 });

module.exports = mongoose.model("Post", PostSchema);
