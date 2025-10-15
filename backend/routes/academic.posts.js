// backend/routes/academic.posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");
const AcademicPost = require("../models/AcademicPost");

/** ---------------- helpers ---------------- **/
function resolveMode({ mode, type, postType, lookingFor }) {
  const inbound = mode || postType || type || (lookingFor ? "looking_for" : "general");
  const k = String(inbound || "").toLowerCase();
  return k === "looking_for" || k === "seeking" || k === "lf" ? "looking_for" : "general";
}

function serialize(doc) {
  const o = doc.toJSON ? doc.toJSON() : { ...doc };
  const m = resolveMode(o);
  return {
    ...o,
    mode: m,
    type: o.type || m,
    postType: o.postType || m,
    lookingFor: typeof o.lookingFor === "boolean" ? o.lookingFor : m === "looking_for",
    likesCount: Array.isArray(o.likes) ? o.likes.length : 0,
  };
}

/** ---------------- list ---------------- **/
/**
 * GET /:school/academic-posts
 * Query:
 *  - page, limit
 *  - q: keyword
 *  - sort: new | old | mostLiked
 *  - type: question | seeking | looking_for
 *  - kind: course_materials | study_mate | coffee_chat ...
 */
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
    if (q) {
      match.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
    }
    if (type) {
      const m = type === "question" ? "general" : type === "seeking" ? "looking_for" : type;
      if (m === "general" || m === "looking_for") match.mode = m;
    }
    if (kind) match.kind = kind;

    let sortStage = { createdAt: -1, _id: -1 };
    if (sortOpt === "old") sortStage = { createdAt: 1, _id: 1 };
    if (sortOpt === "mostliked") sortStage = { likes: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      AcademicPost.find(match).sort(sortStage).skip((page - 1) * limit).limit(limit).lean(),
      AcademicPost.countDocuments(match),
    ]);

    res.json({
      data: items.map(serialize),
      paging: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (err) {
    next(err);
  }
});

/** ---------------- detail ---------------- **/
router.get("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school }).lean();
    if (!doc) return res.status(404).json({ message: "Post not found" });
    res.json(serialize(doc));
  } catch (err) {
    next(err);
  }
});

// ---------------- create ----------------
router.post("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const {
      title,
      content = "",
      mode,
      type,
      postType,
      kind = "",
      images = [],
      anonymous = false, //!!anonymous
      // extras for course_materials
      courseName,
      professor = "",
      materials = [],
    } = req.body;

    const normalizedMode = resolveMode({ mode, type, postType });
    const normalizedKind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    // 공통 title 필수
    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }

    // ✅ seeking:course_materials 강제 규칙
    if (normalizedMode === "looking_for" && normalizedKind === "course_materials") {
      const course = String(courseName || title || "").trim();
      const allowed = new Set(["lecture_notes", "syllabus", "past_exams", "quiz_prep"]);
      const mats = Array.isArray(materials) ? materials.filter((m) => allowed.has(String(m))) : [];
      if (!course) return res.status(400).json({ message: "courseName (or title) is required." });
      if (mats.length === 0) return res.status(400).json({ message: "Select at least one material." });

      const doc = await AcademicPost.create({
        school,
        title: course,                 // title = courseName
        content: "",                   // 내용 비활성
        mode: normalizedMode,
        kind: "course_materials",
        images: [],                    // 이미지 비활성
        anonymous: false, //!!anonymous
        author: req.user.id || req.user._id,
        // extras
        courseName: course,
        professor: String(professor || ""),
        materials: mats,
        // legacy aliases for safety
        type,
        postType,
        lookingFor: true,
      });

      return res.status(201).json(serialize(doc));
    }

    // ✅ 그 외(일반/질문/다른 seeking)는 기존 로직
    const doc = await AcademicPost.create({
  //t.create({
     school,
      title: title.trim(),
      content: String(content || ""),
      mode: normalizedMode,
      kind: normalizedKind,
      images: Array.isArray(images) ? images.map((u) => (typeof u === "string" ? { url: u } : u)) : [],
      anonymous: false, //!!anonymous
      author: req.user.id || req.user._id,
      // legacy aliases
      type,
      postType,
      lookingFor: normalizedMode === "looking_for",
    });
    res.status(201).json(serialize(doc));
  } catch (err) {
    console.error("AcademicPost create error:", err);
    next(err);
  }
});


/** ---------------- update ---------------- **/
router.patch("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });

    const me = String(req.user.id || req.user._id);
    if (String(doc.author) !== me) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, content, mode, type, postType, kind, images, anonymous } = req.body;

    if (typeof title !== "undefined") doc.title = String(title).trim();
    if (typeof content !== "undefined") doc.content = String(content);
    if (typeof images !== "undefined")
      doc.images = Array.isArray(images)
        ? images.map((u) => (typeof u === "string" ? { url: u } : u))
        : [];
    if (typeof anonymous !== "undefined") doc.anonymous = false; //!!anonymous

    if (typeof kind !== "undefined")
      doc.kind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (typeof mode !== "undefined") doc.mode = mode;
    if (typeof type !== "undefined") doc.type = type;
    if (typeof postType !== "undefined") doc.postType = postType;

    // normalize final mode from aliases
    doc.mode = resolveMode({ mode: doc.mode, type: doc.type, postType: doc.postType });

    await doc.save();
    res.json(serialize(doc));
  } catch (err) {
    next(err);
  }
});

/** ---------------- delete ---------------- **/
router.delete("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });

    const me = String(req.user.id || req.user._id);
    if (String(doc.author) !== me) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await AcademicPost.deleteOne({ _id: id, school });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


