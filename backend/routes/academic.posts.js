// backend/routes/academic.posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const AcademicPost = require("../models/AcademicPost");

const modeOf = ({ mode, type, postType, lookingFor }) => {
  const inbound = mode || postType || type || (lookingFor ? "looking_for" : "general");
  const k = String(inbound || "").toLowerCase();
  return k === "looking_for" || k === "seeking" ? "looking_for" : "general";
};

const serialize = (doc) => {
  const o = doc.toJSON ? doc.toJSON() : { ...doc };
  const m = modeOf(o);
  return { ...o, mode: m, type: o.type || m, postType: o.postType || m, lookingFor: m === "looking_for" };
};

// list
router.get("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const q = String(req.query.q || "").trim();
    const sortOpt = String(req.query.sort || "new").toLowerCase();
    const type = String(req.query.type || "").toLowerCase();
    const kind = String(req.query.kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    const match = { school };
    if (q) match.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }];
    if (type) {
      const m = type === "question" ? "general" : type === "seeking" ? "looking_for" : type;
      if (m === "general" || m === "looking_for") match.mode = m;
    }
    if (kind) match.kind = kind;

    let sortStage = { createdAt: -1, _id: -1 };
    if (sortOpt === "old") sortStage = { createdAt: 1, _id: 1 };
    if (sortOpt === "mostliked") sortStage = { likes: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      AcademicPost.find(match).sort(sortStage).skip((page - 1) * limit).limit(limit),
      AcademicPost.countDocuments(match),
    ]);

    res.json({ data: items.map(serialize), paging: { page, limit, total, hasMore: page * limit < total } });
  } catch (e) {
    next(e);
  }
});

// detail
router.get("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });
    res.json(serialize(doc));
  } catch (e) {
    next(e);
  }
});

// create
router.post("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const { title, content = "", mode, type, postType, kind = "", images = [], anonymous = true } = req.body;
    if (!title || typeof title !== "string") return res.status(400).json({ message: "title is required" });

    const normalizedMode = modeOf({ mode, type, postType });

    const doc = await AcademicPost.create({
      school,
      title: title.trim(),
      content: String(content || ""),
      mode: normalizedMode,
      kind: String(kind || "").toLowerCase().replace(/[\s-]+/g, "_"),
      images: Array.isArray(images) ? images.map((u) => ({ url: u })) : [],
      anonymous: !!anonymous,
      author: req.user._id,
      type,
      postType,
      lookingFor: normalizedMode === "looking_for",
    });

    res.status(201).json(serialize(doc));
  } catch (e) {
    next(e);
  }
});

// update
router.patch("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });
    if (String(doc.author) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const { title, content, mode, type, postType, kind, images, anonymous } = req.body;
    if (typeof title !== "undefined") doc.title = String(title).trim();
    if (typeof content !== "undefined") doc.content = String(content);
    if (typeof images !== "undefined") doc.images = (Array.isArray(images) ? images : []).map((u) => ({ url: u }));
    if (typeof anonymous !== "undefined") doc.anonymous = !!anonymous;
    if (typeof kind !== "undefined") doc.kind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (typeof mode !== "undefined") doc.mode = mode;
    if (typeof type !== "undefined") doc.type = type;
    if (typeof postType !== "undefined") doc.postType = postType;
    doc.mode = modeOf({ mode: doc.mode, type: doc.type, postType: doc.postType });

    await doc.save();
    res.json(serialize(doc));
  } catch (e) {
    next(e);
  }
});

// delete
router.delete("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });
    if (String(doc.author) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    await AcademicPost.deleteOne({ _id: id, school });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

