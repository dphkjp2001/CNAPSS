// backend/routes/posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

// 🔒 모든 posts 라우트 보호 + 테넌트 일치 강제
router.use(requireAuth, schoolGuard);

/**
 * GET /
 * Query:
 *  - page (default 1), limit (default 20, max 50)
 *  - q (title/content search, optional)
 *  - sort = new | old (default new)
 *
 * Returns:
 *  { items, page, limit, total }
 */
router.get("/", async (req, res) => {
  try {
    const school = req.user.school;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const q = (req.query.q || "").trim();
    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const sortStage = sortOpt === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    const filter = { school };
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ title: regex }, { content: regex }];
    }

    const [items, total] = await Promise.all([
      Post.find(filter).sort(sortStage).skip((page - 1) * limit).limit(limit).lean(),
      Post.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    console.error("Failed to load posts:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// 👍 내가 좋아요 누른 글
router.get("/liked/:email", async (req, res) => {
  const paramEmail = String(req.params.email).toLowerCase().trim();
  if (req.user.role !== "superadmin" && paramEmail !== req.user.email) {
    return res.status(403).json({ message: "Forbidden." });
  }
  try {
    const likedPosts = await Post.find({
      thumbsUpUsers: paramEmail,
      school: req.user.school,
    }).sort({ createdAt: -1 });
    res.json(likedPosts);
  } catch (err) {
    console.error("Load liked posts error:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 💬 내가 댓글 단 게시글
router.get("/commented/:email", async (req, res) => {
  const paramEmail = String(req.params.email).toLowerCase().trim();
  if (req.user.role !== "superadmin" && paramEmail !== req.user.email) {
    return res.status(403).json({ message: "Forbidden." });
  }
  try {
    const comments = await Comment.find({ email: paramEmail, school: req.user.school });
    if (!comments?.length) return res.json([]);

    const postIds = [...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean))];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({
      _id: { $in: postIds },
      school: req.user.school,
    }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Load commented posts error:", err);
    res.status(500).json({ message: "Failed to load commented posts." });
  }
});

// 단건 조회
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error("Get post error:", err);
    res.status(500).json({ message: "Failed to load post." });
  }
});

// 생성
router.post("/", async (req, res) => {
  try {
    const me = await User.findOne({ email: req.user.email });
    if (!me || !me.isVerified) {
      return res.status(403).json({ message: "Only verified users can write posts." });
    }
    const { title = "", content = "" } = req.body || {};
    const doc = await Post.create({
      title: String(title || "").trim(),
      content: String(content || "").trim(),
      email: req.user.email,
      nickname: me.nickname,             // ✅ 추가: required 필드 채움
      school: req.user.school,
    });
    res.status(201).json({ message: "Post created successfully.", post: doc });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post." });
  }
});

// 수정
router.put("/:id", async (req, res) => {
  try {
    const { title = "", content = "" } = req.body || {};
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    post.title = String(title || "").trim();
    post.content = String(content || "").trim();
    await post.save();
    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 🗑️ 삭제
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Post.deleteOne({ _id: post._id });
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 👍 추천 토글 (자기 글 좋아요 금지)
router.post("/:id/thumbs", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, school: req.user.school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    const me = String(req.user.email || "").toLowerCase();
    if (String(post.email || "").toLowerCase() === me) {
      return res.status(400).json({ message: "You cannot like your own post." });
    }

    const alreadyLiked = (post.thumbsUpUsers || []).map((e) => String(e).toLowerCase()).includes(me);
    const update = alreadyLiked
      ? { $pull: { thumbsUpUsers: me } }
      : { $addToSet: { thumbsUpUsers: me } };

    const next = await Post.findOneAndUpdate(
      { _id: req.params.id, school: req.user.school },
      update,
      { new: true, lean: true }
    );

    res.json({ thumbsUpCount: (next.thumbsUpUsers || []).length });
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

module.exports = router;





