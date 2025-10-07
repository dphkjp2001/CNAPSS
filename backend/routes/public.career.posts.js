// backend/routes/public.career.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const CareerPost = require("../models/CareerPost");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * GET /api/public/:school/career-posts
 * 목록 조회
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
    console.error("public career posts list:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

/**
 * ✅ NEW: 단건 조회 (상세)
 */
router.get("/:id", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const post = await CareerPost.findOne({ _id: req.params.id, school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    const safe = {
      _id: post._id,
      title: post.title,
      content: post.content,
      email: post.email,
      createdAt: post.createdAt,
      thumbsUpUsers: post.thumbsUpUsers || [],
    };
    res.json(safe);
  } catch (err) {
    console.error("public career post detail:", err);
    res.status(500).json({ message: "Failed to load post." });
  }
});

module.exports = router;

