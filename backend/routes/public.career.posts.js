// backend/routes/public.career.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const CareerPost = require("../models/CareerPost");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

function normType(input) {
  const t = String(input || "").toLowerCase().trim();
  if (t === "looking_for" || t === "looking" || t === "lf") return "seeking";
  if (t === "seeking") return "seeking";
  return "question";
}
function legacyType(postType) {
  return postType === "seeking" ? "looking_for" : "question";
}
function normKind(k) {
  const v = String(k || "").toLowerCase().trim();
  if (!v) return "";
  if (v === "study_group") return "study_mate";
  if (["course_materials", "study_mate", "coffee_chat"].includes(v)) return v;
  return "";
}
function serialize(o) {
  const postType = normType(o.postType || o.type || (o.lookingFor || o.isLookingFor ? "looking_for" : "question"));
  const kind = postType === "seeking" ? normKind(o.kind || (Array.isArray(o.tags) ? o.tags.join(" ") : "")) : "";
  return {
    _id: o._id,
    title: o.title,
    content: o.content || "",
    createdAt: o.createdAt,
    thumbsUpUsers: o.thumbsUpUsers || [],
    postType,
    type: legacyType(postType),
    kind,
    tags: o.tags || [],
  };
}

/**
 * GET /api/public/:school/career-posts
 * Query: q, page, limit, sort(new|old), type, kind
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
    const typeFilter = normType(req.query.type || "");
    const kindFilter = normKind(req.query.kind || "");

    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const sortStage = sortOpt === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

    const match = { school };
    if (q) match.title = { $regex: q, $options: "i" };
    if (typeFilter) match.postType = typeFilter;
    if (kindFilter) match.kind = kindFilter;

    const total = await CareerPost.countDocuments(match);
    const items = await CareerPost.find(match)
      .sort(sortStage)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ items: items.map(serialize), page, limit, total });
  } catch (err) {
    console.error("public career posts list:", err);
    res.status(500).json({ message: "Failed to load posts." });
  }
});

/**
 * GET /api/public/:school/career-posts/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    if (!ALLOWED_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }

    const post = await CareerPost.findOne({ _id: req.params.id, school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    res.json(serialize(post));
  } catch (err) {
    console.error("public career post detail:", err);
    res.status(500).json({ message: "Failed to load post." });
  }
});

module.exports = router;


