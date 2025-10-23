// backend/routes/posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Post = require("../models/Post");
const Comment = require("../models/Comment");

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function resolveMode({ board, mode, kind, type, lookingFor }) {
  const inbound = mode || kind || type || (lookingFor ? "looking_for" : null);
  const normalized =
    inbound === "looking_for" || inbound === "looking" || inbound === "lf"
      ? "looking_for"
      : "general";
  return board === "academic" ? normalized : "general";
}

function serializePost(doc) {
  const obj = doc.toJSON ? doc.toJSON() : { ...doc };
  const m = obj.mode || resolveMode(obj);
  const modeFinal = obj.board === "academic" ? m : "general";
  return {
    ...obj,
    mode: modeFinal,
    kind: obj.kind || modeFinal,
    type: obj.type || modeFinal,
    lookingFor:
      typeof obj.lookingFor === "boolean" ? obj.lookingFor : modeFinal === "looking_for",
    likesCount: Array.isArray(obj.likes) ? obj.likes.length : 0,
    upCount: Array.isArray(obj.upvoters) ? obj.upvoters.length : 0,
    downCount: Array.isArray(obj.downvoters) ? obj.downvoters.length : 0,
    score:
      (Array.isArray(obj.upvoters) ? obj.upvoters.length : 0) -
      (Array.isArray(obj.downvoters) ? obj.downvoters.length : 0),
  };
}

// ---------------------------------------------
// GET /:school/posts  (protected list)
// ---------------------------------------------
router.get("/:school/posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;

    const {
      board, // 'free' | 'academic'
      mode,  // 'general' | 'looking_for'
      q,
      page = 1,
      limit = 20,
      sort = "recent", // 'recent' | 'mostLiked' | 'score'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { school };
    if (board) filter.board = board;
    if (mode === "general" || mode === "looking_for") filter.mode = mode;

    if (q && typeof q === "string" && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { content: rx }];
    }

    let sortObj = { createdAt: -1 };
    if (sort === "mostLiked") sortObj = { "likes.length": -1, createdAt: -1 };
    if (sort === "score") sortObj = { score: -1, createdAt: -1 }; // when using aggregation

    // Use aggregation to compute score sort if requested
    if (sort === "score") {
      const items = await Post.aggregate([
        { $match: filter },
        {
          $addFields: {
            upCount: { $size: { $ifNull: ["$upvoters", []] } },
            downCount: { $size: { $ifNull: ["$downvoters", []] } },
            score: { $subtract: [
              { $size: { $ifNull: ["$upvoters", []] } },
              { $size: { $ifNull: ["$downvoters", []] } }
            ] },
          },
        },
        { $sort: sortObj },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ]);
      const total = await Post.countDocuments(filter);
      const data = items.map((i) => serializePost(i));
      return res.json({
        data,
        paging: {
          page: pageNum,
          limit: limitNum,
          total,
          hasMore: pageNum * limitNum < total,
        },
      });
    }

    // default path
    const [items, total] = await Promise.all([
      Post.find(filter).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
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

    // ✅ include myVote for convenience (protected only)
    const me = String(req.user._id);
    const up = Array.isArray(post.upvoters) && post.upvoters.some((u) => String(u) === me);
    const down = Array.isArray(post.downvoters) && post.downvoters.some((u) => String(u) === me);
    serialized.myVote = up ? "up" : down ? "down" : null;

    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// POST /:school/posts (create)
// ---------------------------------------------
router.post("/:school/posts", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    console.log("✅ /api/:school/posts hit");
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);
    console.log("req.params:", req.params);
    
    const { school } = req.params;
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
// PATCH /:school/posts/:id (update)
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

    if (typeof mode !== "undefined") post.mode = mode;
    if (typeof kind !== "undefined") post.kind = kind;
    if (typeof type !== "undefined") post.type = type;
    if (typeof lookingFor !== "undefined") post.lookingFor = lookingFor;

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
      Comment.deleteMany({ post: id, school }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// (legacy) POST /:school/posts/:id/like (toggle like)
// ---------------------------------------------
router.post("/:school/posts/:id/like", requireAuth, schoolGuard, async (req, res, next) => {
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
});

// ---------------------------------------------
// ✅ NEW: POST /:school/posts/:id/vote  (up/downvote for Freeboard)
// body: { dir: "up" | "down" }
// - Freeboard( board === "free" ) 에서만 의미 있음
// - 상호배타 토글, 다시 누르면 취소
// ---------------------------------------------
router.post("/:school/posts/:id/vote", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const { dir } = req.body || {};
    const userId = String(req.user._id);

    if (!["up", "down"].includes(dir)) {
      return res.status(400).json({ message: "Invalid vote direction" });
    }

    const post = await Post.findOne({ _id: id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Only for Freeboard
    if (post.board !== "free") {
      return res.status(400).json({ message: "Voting is allowed on Freeboard only." });
    }

    const hasUp = Array.isArray(post.upvoters) && post.upvoters.some((u) => String(u) === userId);
    const hasDown =
      Array.isArray(post.downvoters) && post.downvoters.some((u) => String(u) === userId);

    if (dir === "up") {
      // toggle up
      if (hasUp) {
        post.upvoters = post.upvoters.filter((u) => String(u) !== userId);
      } else {
        post.upvoters.push(req.user._id);
        if (hasDown) {
          post.downvoters = post.downvoters.filter((u) => String(u) !== userId);
        }
      }
    } else {
      // dir === "down"
      if (hasDown) {
        post.downvoters = post.downvoters.filter((u) => String(u) !== userId);
      } else {
        post.downvoters.push(req.user._id);
        if (hasUp) {
          post.upvoters = post.upvoters.filter((u) => String(u) !== userId);
        }
      }
    }

    await post.save();
    const serialized = serializePost(post.toObject());

    // add myVote to response
    const upNow = serialized.upCount && post.upvoters.some((u) => String(u) === userId);
    const downNow = serialized.downCount && post.downvoters.some((u) => String(u) === userId);

    res.json({
      ...serialized,
      myVote: upNow ? "up" : downNow ? "down" : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;







