// backend/routes/public.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/Post");

// Keep in sync with Post.js enum
const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * GET /api/public/:school/posts
 * Query: page, limit, q, sort(new|old)
 */
router.get("/", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const q = (req.query.q || "").trim();
    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const sortStage = sortOpt === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    const match = { school };
    if (q) match.title = { $regex: q, $options: "i" };

    const total = await Post.countDocuments(match);

    const items = await Post.aggregate([
      { $match: match },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,   // ✅ preview 허용
          images: 1,    // ✅ 이미지 포함
          createdAt: 1,
          school: 1,
          likesCount: { $size: { $ifNull: ["$thumbsUpUsers", []] } },
        },
      },
      { $project: { school: 0 } },
    ]);

    res.json({ page, limit, total, items });
  } catch (err) {
    console.error("Public posts error:", err);
    res.status(500).json({ message: "Failed to load public posts." });
  }
});

/**
 * GET /api/public/:school/posts/:id
 * - 공개 상세 조회 (비로그인 허용)
 */
router.get("/:id", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const post = await Post.findOne(
      { _id: req.params.id, school },
      "_id title content images createdAt"
    ).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    res.json(post);
  } catch (err) {
    console.error("Public post detail error:", err);
    res.status(500).json({ message: "Failed to load public post." });
  }
});

module.exports = router;


