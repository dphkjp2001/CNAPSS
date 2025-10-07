// backend/models/Comment.js
const mongoose = require("mongoose");

const CountsSchema = new mongoose.Schema({
  up:   { type: Number, default: 0 },
  down: { type: Number, default: 0 }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  school: { type: String, required: true, index: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  anonymous: { type: Boolean, default: true },
  body: { type: String, required: true },
  counts: { type: CountsSchema, default: () => ({}) }
}, { timestamps: true });

CommentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", CommentSchema);
