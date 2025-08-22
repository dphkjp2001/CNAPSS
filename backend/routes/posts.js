// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

// ------------------------------
// Helpers
// ------------------------------
function requireSchool(req, res, next) {
  const school = req.query.school || req.body.school;
  if (!school) return res.status(400).json({ message: "school is required" });
  req._school = school;
  next();
}

// ------------------------------
// List posts (scoped by school)
// GET /posts?school=NYU
// ------------------------------
router.get("/", requireSchool, async (req, res) => {
  try {
    const posts = await Post.find({ school: req._school }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Failed to load posts:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// ------------------------------
// Create post (verified users only)
// POST /posts  { email, title, content, school }
// ------------------------------
router.post("/", requireSchool, async (req, res) => {
  const { email, title, content } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res
        .status(403)
        .json({ message: "Only verified users can create posts." });
    }

    const newPost = await Post.create({
      title,
      content,
      email: user.email,
      nickname: user.nickname,
      school: req._school, // ✅ scope
    });

    res.status(201).json(newPost);
  } catch (err) {
    console.error("Create post error:", err);
    res
      .status(500)
      .json({ message: "Failed to create post.", error: err.message });
  }
});

// ------------------------------
// Update post (author only; school guard)
// PUT /posts/:id  { email, title, content, school }
// ------------------------------
router.put("/:id", requireSchool, async (req, res) => {
  const { email, title, content } = req.body;
  const { id } = req.params;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    // school isolation
    if (post.school !== req._school) {
      return res.status(403).json({ message: "School mismatch." });
    }
    // ownership
    if (post.email !== email) {
      return res
        .status(403)
        .json({ message: "You can only edit your own posts." });
    }

    post.title = title;
    post.content = content;
    await post.save();

    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update post error:", err);
    res
      .status(500)
      .json({ message: "Failed to update post.", error: err.message });
  }
});

// ------------------------------
// Toggle like
// POST /posts/:id/thumbs  { email }
// (school는 문서에 이미 저장되어 있으므로 별도 요구 X)
// ------------------------------
router.post("/:id/thumbs", async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const idx = post.thumbsUpUsers.indexOf(email);
    if (idx >= 0) post.thumbsUpUsers.splice(idx, 1);
    else post.thumbsUpUsers.push(email);

    await post.save();
    res.json({ thumbsUpCount: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("Toggle like failed:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

// ------------------------------
// Posts I liked (scoped)
// GET /posts/liked/:email?school=NYU
// ------------------------------
router.get("/liked/:email", requireSchool, async (req, res) => {
  const { email } = req.params;
  try {
    const likedPosts = await Post.find({
      thumbsUpUsers: email,
      school: req._school,
    }).sort({ createdAt: -1 });
    res.json(likedPosts);
  } catch (err) {
    console.error("Failed to load liked posts:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// ------------------------------
// Posts I commented on (scoped)
// GET /posts/commented/:email?school=NYU
// ------------------------------
router.get("/commented/:email", requireSchool, async (req, res) => {
  const { email } = req.params;

  try {
    const comments = await Comment.find({ email }); // comments are global by postId
    if (!comments.length) return res.json([]);

    const postIds = [
      ...new Set(comments.map((c) => c.postId?.toString()).filter(Boolean)),
    ];
    if (!postIds.length) return res.json([]);

    const posts = await Post.find({
      _id: { $in: postIds },
      school: req._school, // ✅ scope
    }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Commented posts error:", err);
    res.status(500).json({
      message: "Failed to load commented posts.",
      error: err.message,
    });
  }
});

// ------------------------------
// Get post detail (optional school check)
// GET /posts/:id  (optionally ?school=NYU to guard)
// ------------------------------
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    // If caller provided school, ensure it matches (prevents cross-school leaks)
    const qsSchool = req.query.school;
    if (qsSchool && post.school !== qsSchool) {
      return res.status(404).json({ message: "Post not found." });
    }

    res.json(post);
  } catch (err) {
    console.error("Fetch post error:", err);
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// ------------------------------
// Delete post (author only; school guard)
// DELETE /posts/:id  { email, school }
// ------------------------------
router.delete("/:id", requireSchool, async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.school !== req._school) {
      return res.status(403).json({ message: "School mismatch." });
    }
    if (post.email !== email) {
      return res
        .status(403)
        .json({ message: "You can only delete your own posts." });
    }

    await Post.findByIdAndDelete(id);
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete post error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete post.", error: err.message });
  }
});

module.exports = router;




