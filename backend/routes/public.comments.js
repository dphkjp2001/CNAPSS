// backend/routes/public.comments.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");

const ALLOWED_SCHOOLS = new Set(["nyu", "columbia", "boston"]);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// 대상 글(Post 또는 AcademicPost) 존재 확인
async function findAnyPostById(postId, school) {
  const [free, academic] = await Promise.all([
    Post.findOne({ _id: postId, school }).select("_id").lean(),
    AcademicPost.findOne({ _id: postId, school }).select("_id").lean(),
  ]);
  return free || academic;
}

// ✅ 공개 댓글 목록
// GET /api/public/:school/comments/:postId
router.get("/:postId", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.has(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    const target = await findAnyPostById(postId, school);
    if (!target) return res.status(404).json({ message: "Post not found." });

    const items = await Comment.find({ postId, school })
      .sort({ createdAt: 1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error("public.comments:list", e);
    res.status(500).json({ message: "Failed to load comments." });
  }
});

module.exports = router;
