// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

const ALLOWED = ["nyu", "columbia", "boston"];
const norm = (s) => String(s || "").trim().toLowerCase();

// 학교 값을 header / query / body 중 하나에서 추출하고 소문자로 정규화
function pickSchool(req) {
  return norm(req.headers["x-school"] || req.query.school || req.body.school || "");
}

// 📌 게시글 목록 (학교 스코프 필터)
router.get("/", async (req, res) => {
  try {
    const school = pickSchool(req);
    if (!school || !ALLOWED.includes(school)) {
      return res.status(400).json({ message: "School is required." });
    }
    const q = { school };
    // author filtering (optional)
    if (req.query.author) q.email = String(req.query.author).toLowerCase();
    const posts = await Post.find(q).sort({ createdAt: -1 }).lean();
    res.json(posts);
  } catch (err) {
    console.error("List posts failed:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// ✅ 게시글 작성 (verified + school 필요)
router.post("/", async (req, res) => {
  try {
    let { email, nickname, title, content } = req.body || {};
    const school = pickSchool(req);

    if (!title || !content || !email || !nickname || !school) {
      return res.status(400).json({ message: "Missing fields." });
    }
    if (!ALLOWED.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    // 사용자 확인 (verified만 허용)
    const user = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (!user || !user.isVerified) {
      return res
        .status(403)
        .json({ message: "Only verified users can create posts." });
    }

    const doc = await Post.create({
      title: String(title).trim(),
      content: String(content).trim(),
      email: String(user.email).toLowerCase(),
      nickname: String(user.nickname).trim(),
      school, // ✅ lowercase
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Create post failed:", err);
    res.status(500).json({ message: "Failed to create post.", error: err.message });
  }
});

// 📌 게시글 상세 (id로 조회)
router.get("/:id", async (req, res) => {
  try {
    const school = pickSchool(req);
    if (!school || !ALLOWED.includes(school)) {
      return res.status(400).json({ message: "School is required." });
    }
    const post = await Post.findOne({ _id: req.params.id, school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error("Get post failed:", err);
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// 📌 게시글 수정 (작성자만)
router.put("/:id", async (req, res) => {
  try {
    const { email, title, content } = req.body || {};
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== String(email).toLowerCase()) {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    post.title = String(title || post.title).trim();
    post.content = String(content || post.content).trim();
    await post.save();

    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update post failed:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 📌 게시글 삭제 (작성자만)
router.delete("/:id", async (req, res) => {
  try {
    const { email } = req.body || {};
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== String(email).toLowerCase()) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete post failed:", err);
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 📌 추천 토글
router.post("/:id/thumbs", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const i = post.thumbsUpUsers.indexOf(email);
    if (i >= 0) post.thumbsUpUsers.splice(i, 1);
    else post.thumbsUpUsers.push(email);

    await post.save();
    res.json({ thumbsUpCount: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("Toggle like failed:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

// 📌 내가 좋아요 누른 글 (학교 스코프 포함)
router.get("/liked/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "").toLowerCase();
    const school = pickSchool(req);
    if (!school || !ALLOWED.includes(school)) {
      return res.status(400).json({ message: "School is required." });
    }

    const likedPosts = await Post.find({ school, thumbsUpUsers: email })
      .sort({ createdAt: -1 })
      .lean();
    res.json(likedPosts);
  } catch (err) {
    console.error("Liked posts failed:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 📌 내가 댓글 단 게시글 (학교 스코프 포함)
router.get("/commented/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "").toLowerCase();
    const school = pickSchool(req);
    if (!school || !ALLOWED.includes(school)) {
      return res.status(400).json({ message: "School is required." });
    }

    const comments = await Comment.find({ email, school }).lean();
    if (!comments.length) return res.json([]);

    const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({ _id: { $in: postIds }, school })
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("Commented posts failed:", err);
    res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
  }
});

module.exports = router;






