// backend/routes/public.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/Post");

// Keep in sync with Post.js enum
const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * GET /api/public/:school/posts
 * Query: page, limit, q, sort(new|old|score)
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

    const match = { school };
    if (q) match.title = { $regex: q, $options: "i" };

    let sortStage = { createdAt: -1, _id: -1 };
    if (sortOpt === "old") sortStage = { createdAt: 1, _id: 1 };
    if (sortOpt === "score") sortStage = { score: -1, createdAt: -1, _id: -1 };

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          upCount: { $size: { $ifNull: ["$upvoters", []] } },
          downCount: { $size: { $ifNull: ["$downvoters", []] } },
          score: {
            $subtract: [
              { $size: { $ifNull: ["$upvoters", []] } },
              { $size: { $ifNull: ["$downvoters", []] } },
            ],
          },
        },
      },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          images: 1,
          commentCount: 1,
          createdAt: 1,
          upCount: 1,
          downCount: 1,
          score: 1,
        },
      },
    ];

    const total = await Post.countDocuments(match);
    const items = await Post.aggregate(pipeline);

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

    const post = await Post.findOne({ _id: req.params.id, school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    const upCount = Array.isArray(post.upvoters) ? post.upvoters.length : 0;
    const downCount = Array.isArray(post.downvoters) ? post.downvoters.length : 0;

    res.json({
      _id: post._id,
      title: post.title,
      content: post.content,
      images: post.images,
      createdAt: post.createdAt,
      upCount,
      downCount,
      score: upCount - downCount,
    });
  } catch (err) {
    console.error("Public post detail error:", err);
    res.status(500).json({ message: "Failed to load public post." });
  }
});

module.exports = router;



