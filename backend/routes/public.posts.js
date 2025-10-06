// backend/routes/public.posts.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/Post");

function normalizeBoard(v) {
  const s = String(v || "").toLowerCase();
  if (["free", "freeboard", "free_board"].includes(s)) return "freeboard";
  if (["academic", "career", "careerboard"].includes(s)) return "academic";
  return "freeboard";
}
function resolveMode(board, m) {
  const mode = String(m || "").toLowerCase();
  if (normalizeBoard(board) === "academic") {
    return mode === "looking_for" ? "looking_for" : "general";
  }
  return "general";
}
function serializeLean(p) {
  const board = normalizeBoard(p.board);
  const mode = resolveMode(board, p.mode || (p.lookingFor ? "looking_for" : ""));
  return {
    _id: p._id,
    title: p.title || "",
    content: p.content || "",
    images: Array.isArray(p.images) ? p.images : [],
    createdAt: p.createdAt,
    board,
    mode,
    kind: p.kind || p.category || p?.meta?.kind || "",
    tags: p.tags || [],
  };
}

// -------- LIST (public) --------
router.get("/", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const { page = 1, limit = 20, sort = "new", q = "", board = "", mode = "" } = req.query;

  const filter = { school };
  const b = normalizeBoard(board);
  if (board) filter.board = b;
  if (mode === "general" || mode === "looking_for") filter.mode = mode;

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { content: rx }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const sortObj = sort === "old" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

  const docs = await Post.find(filter)
    .select("_id title content images createdAt board mode kind category tags")
    .sort(sortObj)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  res.json({ page: pageNum, limit: limitNum, items: docs.map(serializeLean) });
});

// -------- DETAIL (public) --------
router.get("/:id", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const id = req.params.id;
  const p = await Post.findOne(
    { _id: id, school },
    "_id title content images createdAt board mode kind category tags"
  ).lean();

  if (!p) return res.status(404).json({ message: "Post not found" });
  res.json(serializeLean(p));
});

module.exports = router;




