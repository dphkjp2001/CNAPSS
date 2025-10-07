// backend/routes/career.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const CareerPost = require("../models/CareerPost");
const User = require("../models/User");
const Comment = require("../models/Comment");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

// 🔒 Protected + Tenant Guard
router.use(requireAuth, schoolGuard);

/**
 * GET /
 * Returns: { items, page, limit, total }
 * each item includes: _id, title, createdAt, likesCount, commentsCount
 */
router.get("/", async (req, res) => {
  try {
    const school = req.user.school;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const q = (req.query.q || "").trim();
    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const sortStage = sortOpt === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    const match = { school };
    if (q) {
      const regex = new RegExp(q, "i");
      match.$or = [{ title: regex }, { content: regex }];
    }

    const total = await CareerPost.countDocuments(match);

    const items = await CareerPost.aggregate([
      { $match: match },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          createdAt: 1,
          school: 1,
          likesCount: { $size: { $ifNull: ["$thumbsUpUsers", []] } },
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { pid: "$_id", sch: "$school" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$postId", "$$pid"] }, { $eq: ["$school", "$$sch"] }] } } },
            { $count: "c" },
          ],
          as: "cc",
        },
      },
      { $addFields: { commentsCount: { $ifNull: [{ $arrayElemAt: ["$cc.c", 0] }, 0] } } },
      { $project: { cc: 0, school: 0 } },
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    console.error("Failed to load career posts:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

// 👍 Liked, 💬 Commented, 단건 조회, 생성/수정/삭제, thumbs 토글은 기존 코드 그대로 유지
// (밑에 부분은 그대로 두면 됨)


// 👍 Liked
router.get("/liked/:email", async (req, res) => {
  const paramEmail = String(req.params.email).toLowerCase().trim();
  if (req.user.role !== "superadmin" && paramEmail !== req.user.email) {
    return res.status(403).json({ message: "Forbidden." });
  }
  try {
    const likedPosts = await CareerPost.find({
      thumbsUpUsers: paramEmail,
      school: req.user.school,
    }).sort({ createdAt: -1 });
    res.json(likedPosts);
  } catch (err) {
    console.error("Load liked career posts error:", err);
    res.status(500).json({ message: "Failed to load liked posts." });
  }
});

// 💬 Commented
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

    const posts = await CareerPost.find({
      _id: { $in: postIds },
      school: req.user.school,
    }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Load commented career posts error:", err);
    res.status(500).json({ message: "Failed to load commented posts.", error: err.message });
  }
});

// 📌 Detail
router.get("/:id", async (req, res) => {
  try {
    const post = await CareerPost.findOne({ _id: req.params.id, school: req.user.school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error("Fetch career post error:", err);
    res.status(500).json({ message: "Failed to fetch post." });
  }
});

// ✅ Create
router.post("/", async (req, res) => {
  const { title, content } = req.body;
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user || !user.isVerified) {
      return res.status(403).json({ message: "Only verified users can create posts." });
    }

    const newPost = new CareerPost({
      title,
      content,
      email: req.user.email,
      nickname: user.nickname,
      school: req.user.school,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.error("Create career post error:", err);
    res.status(500).json({ message: "Failed to create post.", error: err.message });
  }
});

// ✏️ Update
router.put("/:id", async (req, res) => {
  const { title, content } = req.body;
  try {
    const post = await CareerPost.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own posts." });
    }

    post.title = title;
    post.content = content;
    await post.save();
    res.json({ message: "Post updated successfully.", post });
  } catch (err) {
    console.error("Update career post error:", err);
    res.status(500).json({ message: "Failed to update post.", error: err.message });
  }
});

// 🗑️ Delete
router.delete("/:id", async (req, res) => {
  try {
    const post = await CareerPost.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await CareerPost.deleteOne({ _id: req.params.id, school: req.user.school });
    res.json({ message: "Post deleted successfully." });
  } catch (err) {
    console.error("Delete career post error:", err);
    res.status(500).json({ message: "Failed to delete post.", error: err.message });
  }
});

// 👍 Toggle thumbs
router.post("/:id/thumbs", async (req, res) => {
  try {
    const post = await CareerPost.findOne({ _id: req.params.id, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    const me = String(req.user.email || "").toLowerCase();
    const has = (post.thumbsUpUsers || []).includes(me);
    post.thumbsUpUsers = has
      ? post.thumbsUpUsers.filter((e) => e.toLowerCase() !== me)
      : [...post.thumbsUpUsers, me];
    await post.save();

    res.json({ message: has ? "Like removed." : "Liked.", likes: post.thumbsUpUsers.length });
  } catch (err) {
    console.error("Toggle thumbs error:", err);
    res.status(500).json({ message: "Failed to toggle thumbs.", error: err.message });
  }
});

module.exports = router;
