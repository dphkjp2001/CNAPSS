// backend/routes/public.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/Post");
const Comment = require("../models/Comment");

// Keep in sync with Post.js enum
const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * GET /api/public/:school/posts
 * Query:
 *  - page (default 1), limit (default 20, max 50)
 *  - q (search in title, optional)
 *  - sort = new | old (default new)
 *
 * Returns minimal safe fields:
 *  - _id, title, createdAt, commentsCount, likesCount
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
    if (q) {
      match.title = { $regex: q, $options: "i" }; // search by title only (no sensitive data exposure)
    }

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
          createdAt: 1,
          school: 1,
          likesCount: { $size: { $ifNull: ["$thumbsUpUsers", []] } }, // from Post schema
        },
      },
      // count comments per post (same school)
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
      { $project: { cc: 0, school: 0 } }, // hide internal fields
    ]);

    res.json({ page, limit, total, items });
  } catch (err) {
    console.error("Public posts error:", err);
    res.status(500).json({ message: "Failed to load public posts." });
  }
});

module.exports = router;
