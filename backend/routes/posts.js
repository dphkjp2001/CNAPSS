// backend/routes/posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Post = require("../models/Post");
const Comment = require("../models/Comment");

// ---------------------------------------------
// Helpers: normalize inbound flags into 'mode'
// ---------------------------------------------
function resolveMode({ board, mode, kind, type, lookingFor }) {
  const inbound = mode || kind || type || (lookingFor ? "looking_for" : null);
  const normalized =
    inbound === "looking_for" || inbound === "looking" || inbound === "lf"
      ? "looking_for"
      : "general";
  return board === "academic" ? normalized : "general";
}

// Ensure FE compatibility keys always exist in response
function serializePost(doc) {
  const obj = doc.toJSON ? doc.toJSON() : { ...doc };
  // prefer stored mode; fallback to resolver
  const m = obj.mode || resolveMode(obj);

  const modeFinal = obj.board === "academic" ? m : "general";

  return {
    ...obj,
    mode: modeFinal,
    kind: obj.kind || modeFinal,
    type: obj.type || modeFinal,
    lookingFor:
      typeof obj.lookingFor === "boolean" ? obj.lookingFor : modeFinal === "looking_for",
    // convenience counts
    likesCount: Array.isArray(obj.likes) ? obj.likes.length : 0,
  };
}

// ---------------------------------------------
// GET /:school/posts
// Protected list (board scoped, paging, q, sorting)
// ---------------------------------------------
router.get("/:school/posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;

    const {
      board, // 'free' | 'academic'
      mode, // 'general' | 'looking_for'
      q, // search query on title/content
      page = 1,
      limit = 20,
      sort = "recent", // 'recent' | 'mostLiked'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { school };
    if (board) filter.board = board;

    // If client requests a mode filter, respect it (only meaningful for academic)
    if (mode === "general" || mode === "looking_for") {
      filter.mode = mode;
    }

    if (q && typeof q === "string" && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { content: rx }];
    }

    let sortObj = { createdAt: -1 };
    if (sort === "mostLiked") sortObj = { "likes.length": -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(filter),
    ]);

    const data = items.map(serializePost);

    res.json({
      data,
      paging: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// GET /:school/posts/:id  (detail)
// ---------------------------------------------
router.get("/:school/posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const post = await Post.findOne({ _id: id, school }).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const serialized = serializePost(post);
    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// POST /:school/posts  (create)
// ---------------------------------------------
router.post("/:school/posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;

    // Whitelist but allow aliases (mode/kind/type/lookingFor)
    const {
      title,
      content,
      board = "free",
      images = [],
      anonymous = false,
      mode,
      kind,
      type,
      lookingFor,
    } = req.body;

    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }

    const finalMode = resolveMode({ board, mode, kind, type, lookingFor });

    const post = await Post.create({
      school,
      board,
      title: title.trim(),
      content: content || "",
      images: Array.isArray(images) ? images : [],
      anonymous: !!anonymous,
      author: req.user._id,
      mode: finalMode,
      // keep aliases for backward compatibility
      kind,
      type,
      lookingFor,
    });

    res.status(201).json(serializePost(post));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// PATCH /:school/posts/:id  (update)
// ---------------------------------------------
router.patch("/:school/posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;

    const {
      title,
      content,
      board,
      images,
      anonymous,
      mode,
      kind,
      type,
      lookingFor,
    } = req.body;

    const post = await Post.findOne({ _id: id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (typeof title !== "undefined") post.title = String(title).trim();
    if (typeof content !== "undefined") post.content = String(content);
    if (typeof images !== "undefined") post.images = Array.isArray(images) ? images : [];
    if (typeof anonymous !== "undefined") post.anonymous = !!anonymous;
    if (typeof board !== "undefined") post.board = board;

    // accept alias flags from FE
    if (typeof mode !== "undefined") post.mode = mode;
    if (typeof kind !== "undefined") post.kind = kind;
    if (typeof type !== "undefined") post.type = type;
    if (typeof lookingFor !== "undefined") post.lookingFor = lookingFor;

    // normalize final mode before save
    post.mode = resolveMode({
      board: post.board,
      mode: post.mode,
      kind: post.kind,
      type: post.type,
      lookingFor: post.lookingFor,
    });

    await post.save();
    res.json(serializePost(post));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// DELETE /:school/posts/:id
// ---------------------------------------------
router.delete("/:school/posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;

    const post = await Post.findOne({ _id: id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Promise.all([
      Post.deleteOne({ _id: id, school }),
      // Cascade remove comments for this post (if your Comment schema uses 'post')
      Comment.deleteMany({ post: id, school }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// POST /:school/posts/:id/like  (toggle or explicit action)
// body: { action?: 'like' | 'unlike' }
// ---------------------------------------------
router.post(
  "/:school/posts/:id/like",
  requireAuth,
  schoolGuard,
  async (req, res, next) => {
    try {
      const { school, id } = req.params;
      const { action } = req.body || {};
      const userId = String(req.user._id);

      const post = await Post.findOne({ _id: id, school });
      if (!post) return res.status(404).json({ message: "Post not found" });

      const hasLiked = post.likes.some((u) => String(u) === userId);

      let doLike = !hasLiked;
      if (action === "like") doLike = true;
      if (action === "unlike") doLike = false;

      if (doLike && !hasLiked) {
        post.likes.push(req.user._id);
      } else if (!doLike && hasLiked) {
        post.likes = post.likes.filter((u) => String(u) !== userId);
      }

      await post.save();

      res.json({
        ...serializePost(post.toObject()),
        liked: doLike,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;






