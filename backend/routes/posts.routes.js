// backend/routes/posts.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const Post = require("../models/Post");
const Vote = require("../models/Vote");
const { RULES, addPoints } = require("../services/points.service");
const { aliasForPostAuthor } = require("../utils/anon");

const router = express.Router();
const pickSchool = (req) => (req.params?.school) || (req.user?.school) || req.query.school;

function shapePostForClient(doc, myVote = 0, me) {
  const score = (doc.counts?.up || 0) - (doc.counts?.down || 0);
  const isMine = String(doc.authorId) === String(me);
  return {
    _id: doc._id,
    school: doc.school,
    board: doc.board,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    tags: doc.tags || [],
    commentCount: doc.commentCount || 0,
    counts: doc.counts || { up:0, down:0 },
    score, myVote,
    isMine,
    authorAlias: aliasForPostAuthor(), // ← 글 본문은 항상 "anonymous"
    commentsDisabled: (doc.board === "academic" && doc.type === "looking"),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

// LIST
router.get(["/posts", "/:school/posts"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { board, type, q, sort = "latest", page = 1, limit = 20 } = req.query;
  const filter = { school };
  if (board) filter.board = board;
  if (type)  filter.type  = type;
  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { body: { $regex: q, $options: "i" } }];

  const sortOpt = sort === "top" ? { "counts.up": -1, createdAt: -1 } : { createdAt: -1 };
  const docs = await Post.find(filter).sort(sortOpt).skip((page-1)*limit).limit(Number(limit)).lean();

  const ids = docs.map(d => d._id);
  const votes = await Vote.find({
    school, targetType: "post", targetId: { $in: ids }, userId: req.user._id
  }).lean();
  const myMap = new Map(votes.map(v => [String(v.targetId), v.value]));

  res.json(docs.map(d => shapePostForClient(d, myMap.get(String(d._id)) || 0, req.user._id)));
});

// CREATE
router.post(["/posts", "/:school/posts"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { board, type = "general", title, body = "", anonymous = true, tags = [] } = req.body || {};
  if (!board || !title) return res.status(400).json({ message: "Missing board/title" });
  if (!["free","academic"].includes(board)) return res.status(400).json({ message: "Invalid board" });
  if (board === "free" && type !== "general") return res.status(400).json({ message: "Freeboard type must be 'general'" });
  if (board === "academic" && !["general","looking"].includes(type)) return res.status(400).json({ message: "Invalid academic type" });

  const doc = await Post.create({
    school, board, type, title, body, anonymous, authorId: req.user._id, tags
  });

  // 포인트
  if (board === "free") await addPoints({ userId: req.user._id, reason: "free_post",  delta: RULES.FREE_POST });
  if (board === "academic" && type === "general") await addPoints({ userId: req.user._id, reason: "ac_post",    delta: RULES.AC_POST });
  if (board === "academic" && type === "looking") await addPoints({ userId: req.user._id, reason: "looking_post", delta: RULES.LOOKING_COST });

  res.status(201).json(shapePostForClient(doc.toObject(), 0, req.user._id));
});

// DETAIL
router.get(["/posts/:id", "/:school/posts/:id"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const doc = await Post.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: "Post not found" });
  if (doc.school !== school) return res.status(403).json({ message: "School mismatch" });

  const my = await Vote.findOne({ school, targetType: "post", targetId: doc._id, userId: req.user._id }).lean();
  res.json(shapePostForClient(doc, my ? my.value : 0, req.user._id));
});

// UPDATE
router.patch(["/posts/:id", "/:school/posts/:id"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { title, body, tags, type } = req.body || {};
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.school !== school) return res.status(403).json({ message: "School mismatch" });
  if (String(post.authorId) !== String(req.user._id)) return res.status(403).json({ message: "Not the author" });

  if (post.board === "free" && type && type !== "general") {
    return res.status(400).json({ message: "Freeboard type must remain 'general'" });
  }
  if (typeof title === "string") post.title = title;
  if (typeof body  === "string") post.body  = body;
  if (Array.isArray(tags)) post.tags = tags;
  if (post.board === "academic" && (type === "general" || type === "looking")) post.type = type;

  await post.save();
  res.json(shapePostForClient(post.toObject(), 0, req.user._id));
});

// DELETE
router.delete(["/posts/:id", "/:school/posts/:id"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.school !== school) return res.status(403).json({ message: "School mismatch" });
  if (String(post.authorId) !== String(req.user._id)) return res.status(403).json({ message: "Not the author" });

  await Vote.deleteMany({ school, targetType: "post", targetId: post._id });
  await post.deleteOne();
  res.json({ ok: true });
});

module.exports = router;


