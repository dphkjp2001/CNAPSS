// backend/routes/posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");
const Post = require("../models/Post");

// ---------- helpers ----------
function normalizeBoard(v) {
  const s = String(v || "").toLowerCase();
  if (["free", "freeboard", "free_board"].includes(s)) return "freeboard";
  if (["academic", "career", "careerboard"].includes(s)) return "academic";
  return "freeboard";
}
function resolveMode(board, { mode, lookingFor }) {
  const m = String(mode || (lookingFor ? "looking_for" : "") || "").toLowerCase();
  if (normalizeBoard(board) === "academic") {
    return m === "looking_for" ? "looking_for" : "general";
  }
  return "general";
}
function serialize(doc) {
  const p = doc.toObject ? doc.toObject() : doc;
  const board = normalizeBoard(p.board);
  const mode = resolveMode(board, { mode: p.mode, lookingFor: p.lookingFor });
  return {
    _id: p._id,
    title: p.title || "",
    content: p.content || "",
    images: Array.isArray(p.images) ? p.images : [],
    createdAt: p.createdAt,
    school: p.school,
    board,                            // "freeboard" | "academic"
    mode,                             // "general" | "looking_for"
    kind: p.kind || p.category || p?.meta?.kind || "", // only for looking_for
    tags: p.tags || [],
  };
}

// ---------- LIST (protected) ----------
router.get("/", requireAuth, schoolGuard, async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const {
    page = 1,
    limit = 20,
    sort = "recent",
    q = "",
    board = "",
    mode = "",
  } = req.query;

  const filter = { school };
  const b = normalizeBoard(board);
  if (board) filter.board = b;
  if (mode === "general" || mode === "looking_for") filter.mode = mode;

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { content: rx }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const sortObj = sort === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

  const [items, total] = await Promise.all([
    Post.find(filter).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum),
    Post.countDocuments(filter),
  ]);

  res.json({
    data: items.map(serialize),
    paging: { page: pageNum, limit: limitNum, total, hasMore: pageNum * limitNum < total },
  });
});

// ---------- CREATE (protected) ----------
router.post("/", requireAuth, schoolGuard, async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const {
    title,
    content = "",
    board = "freeboard",
    images = [],
    mode,
    kind,            // only for looking_for
    tags = [],
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: "title is required" });
  }

  const boardNorm = normalizeBoard(board);
  const modeFinal = resolveMode(boardNorm, { mode, lookingFor: req.body?.lookingFor });

  const doc = await Post.create({
    school,
    board: boardNorm,
    title: String(title).trim(),
    content: String(content || ""),
    images: Array.isArray(images) ? images : [],
    mode: modeFinal,          // "general" or "looking_for"
    kind: kind || "",         // for looking_for; empty for general
    tags: Array.isArray(tags) ? tags : [],
    author: req.user?._id,
    authorEmail: req.user?.email || "",
  });

  res.status(201).json(serialize(doc));
});

// ---------- DETAIL (protected) ----------
router.get("/:id", requireAuth, schoolGuard, async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const id = req.params.id;
  const doc = await Post.findOne({ _id: id, school });
  if (!doc) return res.status(404).json({ message: "Post not found" });
  res.json(serialize(doc));
});

module.exports = router;








