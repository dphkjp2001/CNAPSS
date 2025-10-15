// backend/routes/public.academic.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const AcademicPost = require("../models/AcademicPost");

const ALLOWED_SCHOOLS = ["nyu"];

router.get("/", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) return res.status(400).json({ message: "Invalid school." });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);
    const q = (req.query.q || "").trim();
    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const type = String(req.query.type || "").toLowerCase(); // question|seeking|looking_for
    const kind = String(req.query.kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    const match = { school };
    if (q) match.title = { $regex: q, $options: "i" };
    if (type) {
      const m = type === "question" ? "general" : type === "seeking" ? "looking_for" : type;
      if (m === "general" || m === "looking_for") match.mode = m;
    }
    if (kind) match.kind = kind;

    const sortStage = sortOpt === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    const total = await AcademicPost.countDocuments(match);
    const items = await AcademicPost.aggregate([
      { $match: match },
      { $sort: sortStage },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorData'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          images: 1,
          createdAt: 1,
          school: 1,
          mode: 1,
          kind: 1,
          counts: 1,
          hotScore: 1,
          author: 1,
          authorNickname: { $arrayElemAt: ['$authorData.nickname', 0] },
          authorTier: { $arrayElemAt: ['$authorData.tier', 0] },
          // ✅ materials meta for course_materials
          courseName: 1,
          professor: 1,
          materials: 1,
        },
      },
      { $project: { school: 0 } },
    ]);

    res.json({ page, limit, total, items });
  } catch (e) {
    console.error("Public academic posts error:", e);
    res.status(500).json({ message: "Failed to load academic posts." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) return res.status(400).json({ message: "Invalid school." });

    const post = await AcademicPost.findOne(
      { _id: req.params.id, school }
    ).populate('author', 'nickname tier').lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    res.json(post);
  } catch (e) {
    console.error("Public academic post detail error:", e);
    res.status(500).json({ message: "Failed to load academic post." });
  }
});

module.exports = router;




