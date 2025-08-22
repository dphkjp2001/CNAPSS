// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

// 학교 값을 header / query / body 중 하나에서 추출
function pickSchool(req) {
  return (
    req.headers["x-school"] ||
    req.query.school ||
    req.body.school ||
    null
  );
}

// 📌 게시글 목록 (학교 스코프 필터)
router.get("/", async (req, res) => {
  try {
    const school = pickSchool(req);
    const q = school ? { school } : {};
    const posts = await Post.find(q).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// ✅ 게시글 작성 (verified + school 필요)
router.post("/", async (req, res) => {
  const { email, title, content } = req.body;
  const school = pickSchool(req);

  if (!school) {
    return res.status(400).json({ message: "school is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(403).json({ message: "Only verified users can create posts." });
    }

    const newPost = new Post({
      title,
      content,
      email: user.email,
      nickname: user.nickname,
      school, // ✅ 스코프 저장
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error("게시글 작성 오류:", err);
    res.status(500).json({ message: "Failed to create post.", error: err.message });
  }
});

// 📌 게시글 상세 (id로 조회 - 스코프 체크는 선택)
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// 📌 게시글 수정 (작성자만)
router.put("/:id", async (req, res) => {
  const { email, title, content } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== email) {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    post.title = title;
    post.content = content;
    await post.save();

    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("수정 오류:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 📌 게시글 삭제 (작성자만)
router.delete("/:id", async (req, res) => {
  const { email } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== email) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 📌 추천 토글
router.post("/:id/thumbs", async (req, res) => {
  const { email } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const i = post.thumbsUpUsers.indexOf(email);
    if (i >= 0) post.thumbsUpUsers.splice(i, 1);
    else post.thumbsUpUsers.push(email);

    await post.save();
    res.json({ thumbsUpCount: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("게시물 추천 실패:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

// 📌 내가 좋아요 누른 글 (학교 스코프 포함)
router.get("/liked/:email", async (req, res) => {
  const { email } = req.params;
  const school = pickSchool(req);

  try {
    const q = { thumbsUpUsers: email };
    if (school) q.school = school;
    const likedPosts = await Post.find(q).sort({ createdAt: -1 });
    res.json(likedPosts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 📌 내가 댓글 단 게시글 (학교 스코프 포함)
router.get("/commented/:email", async (req, res) => {
  const { email } = req.params;
  const school = pickSchool(req);

  try {
    const comments = await Comment.find({ email, ...(school ? { school } : {}) });
    if (!comments.length) return res.json([]);

    const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({ _id: { $in: postIds }, ...(school ? { school } : {}) })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("❌ CommentedPosts 에러:", err);
    res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
  }
});

module.exports = router;





