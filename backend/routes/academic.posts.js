// // backend/routes/academic.posts.js
// const express = require("express");
// const router = express.Router();

// const requireAuth = require("../middleware/requireAuth");
// const schoolGuard = require("../middleware/schoolGuard");
// const AcademicPost = require("../models/AcademicPost");

// /** ---------------- helpers ---------------- **/
// function resolveMode({ mode, type, postType, lookingFor }) {
//   const inbound = mode || postType || type || (lookingFor ? "looking_for" : "general");
//   const k = String(inbound || "").toLowerCase();
//   return k === "looking_for" || k === "seeking" || k === "lf" ? "looking_for" : "general";
// }

// function serialize(doc) {
//   const o = doc.toJSON ? doc.toJSON() : { ...doc };
//   const m = resolveMode(o);
//   return {
//     ...o,
//     mode: m,
//     type: o.type || m,
//     postType: o.postType || m,
//     lookingFor: typeof o.lookingFor === "boolean" ? o.lookingFor : m === "looking_for",
//     likesCount: Array.isArray(o.likes) ? o.likes.length : 0,
//   };
// }

// /** ---------------- list ---------------- **/
// router.get("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school } = req.params;
//     const page = Math.max(parseInt(req.query.page || "1", 10), 1);
//     const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
//     const q = String(req.query.q || "").trim();
//     const sortOpt = String(req.query.sort || "new").toLowerCase();
//     const type = String(req.query.type || "").toLowerCase();
//     const kind = String(req.query.kind || "").toLowerCase().replace(/[\s-]+/g, "_");

//     const match = { school };
//     if (q) {
//       match.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }];
//     }
//     if (type) {
//       const m = type === "question" ? "general" : type === "seeking" ? "looking_for" : type;
//       if (m === "general" || m === "looking_for") match.mode = m;
//     }
//     if (kind) match.kind = kind;

//     let sortStage = { createdAt: -1, _id: -1 };
//     if (sortOpt === "old") sortStage = { createdAt: 1, _id: 1 };

//     const [items, total] = await Promise.all([
//       AcademicPost.find(match).sort(sortStage).skip((page - 1) * limit).limit(limit).lean(),
//       AcademicPost.countDocuments(match),
//     ]);

//     res.json({
//       data: items.map(serialize),
//       paging: { page, limit, total, hasMore: page * limit < total },
//     });
//   } catch (err) { next(err); }
// });

// /** ---------------- protected detail ---------------- **/
// router.get("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school, id } = req.params;
//     const doc = await AcademicPost.findOne({ _id: id, school }).lean();
//     if (!doc) return res.status(404).json({ message: "Post not found" });

//     const out = serialize(doc);

//     const me = String(req.user._id || req.user.id);
//     const up = Array.isArray(doc.upvoters) && doc.upvoters.some(u => String(u) === me);
//     const down = Array.isArray(doc.downvoters) && doc.downvoters.some(u => String(u) === me);
//     out.myVote = up ? "up" : down ? "down" : null;

//     res.json(out);
//   } catch (err) { next(err); }
// });

// /** ---------------- create ---------------- **/
// router.post("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school } = req.params;
//     const {
//       title,
//       content = "",
//       mode, type, postType,
//       kind = "",
//       images = [],
//       anonymous = false,
//       courseName, professor = "", materials = [],
//     } = req.body;

//     const normalizedMode = resolveMode({ mode, type, postType });
//     const normalizedKind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

//     if (!title || typeof title !== "string") {
//       return res.status(400).json({ message: "title is required" });
//     }

//     if (normalizedMode === "looking_for" && normalizedKind === "course_materials") {
//       const course = String(courseName || title || "").trim();
//       const allowed = new Set(["lecture_notes", "syllabus", "past_exams", "quiz_prep"]);
//       const mats = Array.isArray(materials) ? materials.filter((m) => allowed.has(String(m))) : [];
//       if (!course) return res.status(400).json({ message: "courseName (or title) is required." });
//       if (mats.length === 0) return res.status(400).json({ message: "Select at least one material." });

//       const doc = await AcademicPost.create({
//         school,
//         title: course,
//         content: "",
//         mode: normalizedMode,
//         kind: "course_materials",
//         images: [],
//         anonymous: false, //!!anonymous
//         author: req.user.id || req.user._id,
//         courseName: course,
//         professor: String(professor || ""),
//         materials: mats,
//         type, postType, lookingFor: true,
//       });
//       return res.status(201).json(serialize(doc));
//     }

//     const doc = await AcademicPost.create({
//       school,
//       title: title.trim(),
//       content: String(content || ""),
//       mode: normalizedMode,
//       kind: normalizedKind,
//       images: Array.isArray(images) ? images.map((u) => (typeof u === "string" ? { url: u } : u)) : [],
//       anonymous: false, //!!anonymous
//       author: req.user.id || req.user._id,
//       type, postType, lookingFor: normalizedMode === "looking_for",
//     });
//     res.status(201).json(serialize(doc));
//   } catch (err) {
//     console.error("AcademicPost create error:", err);
//     next(err);
//   }
// });

// /** ---------------- update ---------------- **/
// router.patch("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school, id } = req.params;
//     const doc = await AcademicPost.findOne({ _id: id, school });
//     if (!doc) return res.status(404).json({ message: "Post not found" });

//     const me = String(req.user.id || req.user._id);
//     if (String(doc.author) !== me) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     const { title, content, mode, type, postType, kind, images, anonymous } = req.body;

//     if (typeof title !== "undefined") doc.title = String(title).trim();
//     if (typeof content !== "undefined") doc.content = String(content);
//     if (typeof images !== "undefined")
//       doc.images = Array.isArray(images) ? images.map((u) => (typeof u === "string" ? { url: u } : u)) : [];
//     if (typeof anonymous !== "undefined") doc.anonymous = false; //!!anonymous

//     if (typeof kind !== "undefined")
//       doc.kind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

//     if (typeof mode !== "undefined") doc.mode = mode;
//     if (typeof type !== "undefined") doc.type = type;
//     if (typeof postType !== "undefined") doc.postType = postType;

//     doc.mode = resolveMode({ mode: doc.mode, type: doc.type, postType: doc.postType });

//     await doc.save();
//     res.json(serialize(doc));
//   } catch (err) { next(err); }
// });

// /** ---------------- delete ---------------- **/
// router.delete("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school, id } = req.params;
//     const doc = await AcademicPost.findOne({ _id: id, school });
//     if (!doc) return res.status(404).json({ message: "Post not found" });

//     const me = String(req.user.id || req.user._id);
//     if (String(doc.author) !== me) {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     await AcademicPost.deleteOne({ _id: id, school });
//     res.json({ ok: true });
//   } catch (err) { next(err); }
// });

// /** ---------------- NEW: vote ----------------
//  * POST /:school/academic-posts/:id/vote
//  * body: { dir: "up" | "down" }
//  * - 작성자 투표 금지
//  * - mode === "general" 만 허용
//  * - 상호배타 + 토글
//  * - ❗ 반대편 전환 금지(먼저 취소해야 함)
//  ------------------------------------------------*/
// router.post("/:school/academic-posts/:id/vote", requireAuth, schoolGuard, async (req, res, next) => {
//   try {
//     const { school, id } = req.params;
//     const { dir } = req.body || {};
//     const userId = String(req.user._id || req.user.id);

//     if (!["up", "down"].includes(dir)) {
//       return res.status(400).json({ message: "Invalid vote direction" });
//     }

//     const post = await AcademicPost.findOne({ _id: id, school });
//     if (!post) return res.status(404).json({ message: "Post not found" });

//     if ((post.mode || "general") !== "general") {
//       return res.status(400).json({ message: "Voting is only allowed on general questions." });
//     }

//     if (String(post.author) === userId) {
//       return res.status(403).json({ message: "Authors cannot vote on their own posts." });
//     }

//     const hasUp = Array.isArray(post.upvoters) && post.upvoters.some(u => String(u) === userId);
//     const hasDown = Array.isArray(post.downvoters) && post.downvoters.some(u => String(u) === userId);

//     // ❗ 반대편 전환 금지
//     if ((dir === "up" && hasDown) || (dir === "down" && hasUp)) {
//       return res.status(400).json({ message: "Cancel your current vote before switching." });
//     }

//     if (dir === "up") {
//       if (hasUp) {
//         await AcademicPost.updateOne({ _id: id, school }, { $pull: { upvoters: req.user._id } });
//       } else {
//         await AcademicPost.updateOne({ _id: id, school }, { $addToSet: { upvoters: req.user._id } });
//       }
//     } else {
//       if (hasDown) {
//         await AcademicPost.updateOne({ _id: id, school }, { $pull: { downvoters: req.user._id } });
//       } else {
//         await AcademicPost.updateOne({ _id: id, school }, { $addToSet: { downvoters: req.user._id } });
//       }
//     }

//     const fresh = await AcademicPost.findOne({ _id: id, school }, { upvoters: 1, downvoters: 1 }).lean();
//     const upCount = (fresh?.upvoters || []).length;
//     const downCount = (fresh?.downvoters || []).length;
//     const myVote =
//       (fresh?.upvoters || []).some(u => String(u) === userId) ? "up" :
//       (fresh?.downvoters || []).some(u => String(u) === userId) ? "down" : null;

//     res.json({ ok: true, upCount, downCount, myVote });
//   } catch (err) { next(err); }
// });

// module.exports = router;




// backend/routes/academic.posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");
const AcademicPost = require("../models/AcademicPost");
const { nanoid } = require("nanoid");

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
    upCount:
      Array.isArray(o.upvoters) ? o.upvoters.length : (o.counts?.up || 0),
    downCount:
      Array.isArray(o.downvoters) ? o.downvoters.length : (o.counts?.down || 0),
  };
}

/** ---------------- list ---------------- **/
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
      match.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }];
    }
    if (type) {
      const m = type === "question" ? "general" : type === "seeking" ? "looking_for" : type;
      if (m === "general" || m === "looking_for") match.mode = m;
    }
    if (kind) match.kind = kind;

    let sortStage = { createdAt: -1, _id: -1 };
    if (sortOpt === "old") sortStage = { createdAt: 1, _id: 1 };

    const [items, total] = await Promise.all([
      AcademicPost.find(match).sort(sortStage).skip((page - 1) * limit).limit(limit).lean(),
      AcademicPost.countDocuments(match),
    ]);

    res.json({
      data: items.map(serialize),
      paging: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (err) { next(err); }
});

/** ---------------- protected detail ---------------- **/
router.get("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school }).lean();
    if (!doc) return res.status(404).json({ message: "Post not found" });

    const out = serialize(doc);

    const me = String(req.user._id || req.user.id);
    const up = Array.isArray(doc.upvoters) && doc.upvoters.some(u => String(u) === me);
    const down = Array.isArray(doc.downvoters) && doc.downvoters.some(u => String(u) === me);
    out.myVote = up ? "up" : down ? "down" : null;
    out.isMine = String(doc.author) === me;

    res.json(out);
  } catch (err) { next(err); }
});

/** ---------------- create ---------------- **/
router.post("/:school/academic-posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const {
      title,
      content = "",
      mode, type, postType,
      kind = "",
      images = [],
      anonymous = false,
      courseName, professor = "", materials = [],
    } = req.body;

    const normalizedMode = resolveMode({ mode, type, postType });
    const normalizedKind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }

    // seeking: course_materials
    if (normalizedMode === "looking_for" && normalizedKind === "course_materials") {
      const course = String(courseName || title || "").trim();
      const allowed = new Set(["lecture_notes", "syllabus", "past_exams", "quiz_prep"]);
      const mats = Array.isArray(materials) ? materials.filter((m) => allowed.has(String(m))) : [];
      if (!course) return res.status(400).json({ message: "courseName (or title) is required." });
      if (mats.length === 0) return res.status(400).json({ message: "Select at least one material." });

      const doc = await AcademicPost.create({
        school,
        title: course,
        content: "",
        mode: normalizedMode,
        kind: "course_materials",
        images: [],
        anonymous: !!anonymous,
        author: req.user.id || req.user._id,
        courseName: course,
        professor: String(professor || ""),
        materials: mats,
        type, postType, lookingFor: true,
        shortId: nanoid(10),
      });
      return res.status(201).json(serialize(doc));
    }

    // general or other seeking kinds
    const doc = await AcademicPost.create({
      school,
      title: title.trim(),
      content: String(content || ""),
      mode: normalizedMode,
      kind: normalizedKind,
      images: Array.isArray(images) ? images.map((u) => (typeof u === "string" ? { url: u } : u)) : [],
      anonymous: !!anonymous,
      author: req.user.id || req.user._id,
      type, postType, lookingFor: normalizedMode === "looking_for",
      shortId: nanoid(10),
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
    if (String(doc.author) !== me) return res.status(403).json({ message: "Forbidden" });

    const { title, content, mode, type, postType, kind, images, anonymous } = req.body;

    if (typeof title !== "undefined") doc.title = String(title).trim();
    if (typeof content !== "undefined") doc.content = String(content);
    if (typeof images !== "undefined")
      doc.images = Array.isArray(images) ? images.map((u) => (typeof u === "string" ? { url: u } : u)) : [];
    if (typeof anonymous !== "undefined") doc.anonymous = !!anonymous;

    if (typeof kind !== "undefined")
      doc.kind = String(kind || "").toLowerCase().replace(/[\s-]+/g, "_");

    if (typeof mode !== "undefined") doc.mode = mode;
    if (typeof type !== "undefined") doc.type = type;
    if (typeof postType !== "undefined") doc.postType = postType;

    doc.mode = resolveMode({ mode: doc.mode, type: doc.type, postType: doc.postType });

    await doc.save();
    res.json(serialize(doc));
  } catch (err) { next(err); }
});

/** ---------------- delete ---------------- **/
router.delete("/:school/academic-posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const doc = await AcademicPost.findOne({ _id: id, school });
    if (!doc) return res.status(404).json({ message: "Post not found" });

    const me = String(req.user.id || req.user._id);
    if (String(doc.author) !== me) return res.status(403).json({ message: "Forbidden" });

    await AcademicPost.deleteOne({ _id: id, school });
    res.json({ ok: true });
  } catch (err) { next(err); }
});


router.get("/:school/academic-posts/my", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const me = String(req.user._id || req.user.id);
    const items = await AcademicPost.find({ school, author: me })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
    res.json(items.map(serialize));
  } catch (err) { next(err); }
});


/** ---------------- vote (mutually exclusive + toggle) ---------------- **/
router.post("/:school/academic-posts/:id/vote", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const { dir } = req.body || {};
    const userId = String(req.user._id || req.user.id);

    if (!["up", "down"].includes(dir)) {
      return res.status(400).json({ message: "Invalid vote direction" });
    }

    const post = await AcademicPost.findOne({ _id: id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });

    if ((post.mode || "general") !== "general") {
      return res.status(400).json({ message: "Voting is only allowed on general questions." });
    }

    if (String(post.author) === userId) {
      return res.status(403).json({ message: "Authors cannot vote on their own posts." });
    }

    const hasUp = Array.isArray(post.upvoters) && post.upvoters.some(u => String(u) === userId);
    const hasDown = Array.isArray(post.downvoters) && post.downvoters.some(u => String(u) === userId);

    // must cancel before switching
    if ((dir === "up" && hasDown) || (dir === "down" && hasUp)) {
      return res.status(400).json({ message: "Cancel your current vote before switching." });
    }

    if (dir === "up") {
      if (hasUp) {
        await AcademicPost.updateOne({ _id: id, school }, { $pull: { upvoters: req.user._id } });
      } else {
        await AcademicPost.updateOne({ _id: id, school }, { $addToSet: { upvoters: req.user._id } });
      }
    } else {
      if (hasDown) {
        await AcademicPost.updateOne({ _id: id, school }, { $pull: { downvoters: req.user._id } });
      } else {
        await AcademicPost.updateOne({ _id: id, school }, { $addToSet: { downvoters: req.user._id } });
      }
    }

    const fresh = await AcademicPost.findOne({ _id: id, school }, { upvoters: 1, downvoters: 1 }).lean();
    const upCount = (fresh?.upvoters || []).length;
    const downCount = (fresh?.downvoters || []).length;
    const myVote =
      (fresh?.upvoters || []).some(u => String(u) === userId) ? "up" :
      (fresh?.downvoters || []).some(u => String(u) === userId) ? "down" : null;

    // broadcast (optional)
    const io = req.app.get("io");
    if (io) io.to(`post:${id}`).emit("post:voteUpdated", { postId: id, upCount, downCount });

    res.json({ ok: true, upCount, downCount, myVote });
  } catch (err) { next(err); }
});

module.exports = router;
