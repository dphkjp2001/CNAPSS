// backend/routes/posts.js
const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const mongoose = require("mongoose");
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

// ✅ 다양한 id 키로 조회
async function findPostByAnyId({ id, school }) {
  const s = String(school || "").toLowerCase();
  const key = String(id || "");
  const isObjId = mongoose.Types.ObjectId.isValid(key);

  if (isObjId) {
    const byOid = await Post.findOne({ _id: key, school: s });
    if (byOid) return byOid;
  }
  return await Post.findOne({
    school: s,
    $or: [{ shortId: key }, { slug: key }, { publicId: key }],
  });
}

// ---------------------------------------------
// GET /:school/posts/my  (only current user's posts)
// ---------------------------------------------
router.get("/:school/posts/my", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school } = req.params;
    const userId = String(req.user._id || req.user.id);
    console.log("req.user", req.user);


    const posts = await Post.find({ school, author: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts.map(serializePost));
  } catch (err) {
    next(err);
  }
});


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
            score: {
              $subtract: [
                { $size: { $ifNull: ["$upvoters", []] } },
                { $size: { $ifNull: ["$downvoters", []] } },
              ],
            },
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
//  - id가 ObjectId가 아니면 shortId/slug/publicId로 조회
// ---------------------------------------------
router.get("/:school/posts/:id", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;

    const post = await findPostByAnyId({ id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const serialized = serializePost(post);

    // ✅ include myVote (req.user.id 보장)
    const me = String(req.user._id || req.user.id || "");
    const up =
      Array.isArray(post.upvoters) && post.upvoters.some((u) => String(u) === me);
    const down =
      Array.isArray(post.downvoters) && post.downvoters.some((u) => String(u) === me);
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
      author: req.user._id || req.user.id,
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

    const post = await findPostByAnyId({ id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(req.user._id || req.user.id)) {
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

    const post = await findPostByAnyId({ id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) !== String(req.user._id || req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Promise.all([
      Post.deleteOne({ _id: post._id, school }),
      Comment.deleteMany({ postId: post._id, school }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------
// ❌ (legacy) thumbs like 라우트 제거됨
// ---------------------------------------------

// ---------------------------------------------
// ✅ POST /:school/posts/:id/vote  (Up/Down)
// - 상호배타 + 토글
// - 반대편 전환 금지(먼저 취소)
// - free / academic 모두 허용
// - 투표 후 socket.io로 같은 게시글 room에 브로드캐스트
// ---------------------------------------------
router.post("/:school/posts/:id/vote", requireAuth, schoolGuard, async (req, res, next) => {
  try {
    const { school, id } = req.params;
    const { dir } = req.body || {};
    const userId = String(req.user._id || req.user.id);

    if (!["up", "down"].includes(dir)) {
      return res.status(400).json({ message: "Invalid vote direction" });
    }

    const post = await Post.findOne({ _id: id, school });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // ✅ author cannot vote on own post
    if (String(post.author) === userId) {
      return res.status(403).json({ message: "Authors cannot vote on their own posts." });
    }

    const hasUp = Array.isArray(post.upvoters) && post.upvoters.some(u => String(u) === userId);
    const hasDown = Array.isArray(post.downvoters) && post.downvoters.some(u => String(u) === userId);

    // 반대편 전환 금지
    if ((dir === "up" && hasDown) || (dir === "down" && hasUp)) {
      return res.status(400).json({ message: "Cancel your current vote before switching." });
    }

    if (dir === "up") {
      if (hasUp) {
        await Post.updateOne({ _id: id, school }, { $pull: { upvoters: req.user._id || req.user.id } });
      } else {
        await Post.updateOne({ _id: id, school }, { $addToSet: { upvoters: req.user._id || req.user.id } });
      }
    } else {
      if (hasDown) {
        await Post.updateOne({ _id: id, school }, { $pull: { downvoters: req.user._id || req.user.id } });
      } else {
        await Post.updateOne({ _id: id, school }, { $addToSet: { downvoters: req.user._id || req.user.id } });
      }
    }

    const fresh = await Post.findOne({ _id: id, school }, { upvoters: 1, downvoters: 1 }).lean();
    const upCount = (fresh?.upvoters || []).length;
    const downCount = (fresh?.downvoters || []).length;
    const myVote =
      (fresh?.upvoters || []).some(u => String(u) === userId) ? "up" :
      (fresh?.downvoters || []).some(u => String(u) === userId) ? "down" : null;

    // ✅ 소켓 브로드캐스트
    const io = req.app.get("io");
    if (io) {
      io.to(`post:${id}`).emit("post:voteUpdated", { postId: id, upCount, downCount });
    }

    return res.json({ ok: true, upCount, downCount, myVote });
  } catch (err) { next(err); }
});

module.exports = router;









