// // backend/routes/comments.js
// const express = require("express");
// const router = express.Router({ mergeParams: true });
// const mongoose = require("mongoose");

// const requireAuth = require("../middleware/requireAuth");
// const schoolGuard = require("../middleware/schoolGuard");

// const Comment = require("../models/Comment");
// const Post = require("../models/Post");
// const CareerPost = require("../models/CareerPost");
// const User = require("../models/User");

// router.use(requireAuth, schoolGuard);

// function isValidObjectId(id) {
//   return mongoose.Types.ObjectId.isValid(id);
// }

// /**
//  * 대상 글 존재 확인 (Freeboard Post 또는 CareerPost)
//  * - 둘 중 하나라도 같은 school로 존재하면 OK
//  */
// async function findAnyPostById(postId, school) {
//   const [free, career] = await Promise.all([
//     Post.findOne({ _id: postId, school }).select("_id").lean(),
//     CareerPost.findOne({ _id: postId, school }).select("_id").lean(),
//   ]);
//   return free || career; // 하나라도 있으면 truthy
// }

// // GET /api/:school/comments/:postId
// router.get("/:postId", async (req, res) => {
//   const { postId } = req.params;
//   if (!isValidObjectId(postId)) {
//     return res.status(400).json({ message: "Invalid postId" });
//   }
//   try {
//     const target = await findAnyPostById(postId, req.user.school);
//     if (!target) return res.status(404).json({ message: "Post not found." });

//     const items = await Comment.find({ postId, school: req.user.school })
//       .sort({ createdAt: 1 })
//       .lean();

//     res.json(items);
//   } catch (e) {
//     console.error("comments:list", e);
//     res.status(500).json({ message: "Failed to load comments." });
//   }
// });

// // POST /api/:school/comments/:postId
// router.post("/:postId", async (req, res) => {
//   const { postId } = req.params;
//   let { content, parentId = null } = req.body;
//   content = String(content || "").trim();

//   if (!isValidObjectId(postId)) {
//     return res.status(400).json({ message: "Invalid postId" });
//   }
//   if (!content) return res.status(400).json({ message: "Content required" });

//   try {
//     const me = await User.findOne({ email: req.user.email });
//     if (!me || !me.isVerified) {
//       return res.status(403).json({ message: "Only verified users can comment." });
//     }

//     const target = await findAnyPostById(postId, req.user.school);
//     if (!target) return res.status(404).json({ message: "Post not found." });

//     let parent = null;
//     if (parentId) {
//       if (!isValidObjectId(parentId)) {
//         return res.status(400).json({ message: "Invalid parentId" });
//       }
//       parent = await Comment.findOne({ _id: parentId, postId, school: req.user.school });
//       if (!parent) return res.status(400).json({ message: "Parent comment not found." });
//     }

//     const doc = await Comment.create({
//       postId,
//       email: req.user.email,
//       nickname: me.nickname, // nickname은 DB에 저장(표시는 프론트에서 정책대로)
//       content,
//       parentId: parent ? parent._id : null,
//       school: req.user.school,
//     });

//     // 🔔 실시간 전파(기존 채널명 그대로 유지)
//     try {
//       const io = req.app.get("io");
//       if (io) {
//         const out = doc.toObject();
//         io.to(`post:${postId}`).emit("comment:new", out);
//       }
//     } catch (_) {}

//     res.status(201).json(doc);
//   } catch (e) {
//     console.error("comments:create", e);
//     res.status(500).json({ message: "Failed to add comment." });
//   }
// });

// // PUT /api/:school/comments/:id
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   let { content } = req.body;
//   content = String(content || "").trim();

//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: "Invalid comment id" });
//   }
//   if (!content) return res.status(400).json({ message: "Content required" });

//   try {
//     const comment = await Comment.findOne({ _id: id, school: req.user.school });
//     if (!comment) return res.status(404).json({ message: "Comment not found." });
//     if (comment.email !== req.user.email && req.user.role !== "superadmin") {
//       return res.status(403).json({ message: "You can only edit your own comments." });
//     }

//     comment.content = content;
//     await comment.save();

//     try {
//       const io = req.app.get("io");
//       if (io) {
//         io.to(`post:${comment.postId}`).emit("comment:update", comment.toObject());
//       }
//     } catch (_) {}

//     res.json(comment);
//   } catch (e) {
//     console.error("comments:update", e);
//     res.status(500).json({ message: "Failed to update comment." });
//   }
// });

// // DELETE /api/:school/comments/:id
// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: "Invalid comment id" });
//   }
//   try {
//     const owned = await Comment.findOne({ _id: id, school: req.user.school }).select("email postId");
//     if (!owned) return res.status(404).json({ message: "Comment not found." });
//     if (owned.email !== req.user.email && req.user.role !== "superadmin") {
//       return res.status(403).json({ message: "You can only delete your own comments." });
//     }

//     await Comment.deleteOne({ _id: id, school: req.user.school });

//     try {
//       const io = req.app.get("io");
//       if (io) io.to(`post:${owned.postId}`).emit("comment:delete", { _id: id });
//     } catch (_) {}

//     res.json({ ok: true });
//   } catch (e) {
//     console.error("comments:delete", e);
//     res.status(500).json({ message: "Failed to delete comment." });
//   }
// });

// // POST /api/:school/comments/:commentId/thumbs
// // 👉 자기 댓글 좋아요 금지
// router.post("/:commentId/thumbs", async (req, res) => {
//   try {
//     const { commentId } = req.params;
//     if (!isValidObjectId(commentId)) {
//       return res.status(400).json({ message: "Invalid comment id" });
//     }

//     const email = String(req.user.email || "").toLowerCase();

//     const cur = await Comment.findOne({ _id: commentId, school: req.user.school })
//       .select("email thumbsUpUsers postId")
//       .lean();
//     if (!cur) return res.status(404).json({ message: "Not found" });

//     if (String(cur.email || "").toLowerCase() === email) {
//       return res.status(400).json({ message: "You cannot like your own comment." });
//     }

//     const has = (cur.thumbsUpUsers || [])
//       .map((e) => String(e || "").toLowerCase())
//       .includes(email);

//     const update = has
//       ? { $pull: { thumbsUpUsers: email } }
//       : { $addToSet: { thumbsUpUsers: email } };

//     const next = await Comment.findOneAndUpdate(
//       { _id: commentId, school: req.user.school },
//       update,
//       { new: true, lean: true }
//     );

//     try {
//       const io = req.app.get("io");
//       if (io) io.to(`post:${cur.postId}`).emit("comment:thumbs", { _id: commentId, thumbs: next.thumbsUpUsers || [] });
//     } catch (_) {}

//     const arr = next.thumbsUpUsers || [];
//     res.json({ thumbs: arr, count: arr.length });
//   } catch (e) {
//     console.error("comments:thumbs", e);
//     res.status(500).json({ message: "Failed to toggle like." });
//   }
// });

// module.exports = router;



// backend/routes/public.comments.js
//
// Public comments API (read-only)
// - Works without CareerPost; uses Comment + Post collection
// - No auth required
//
const express = require("express");
const router = express.Router({ mergeParams: true });

const Comment = require("../models/Comment");
const Post = require("../models/Post");

/**
 * GET /api/public/:school/comments
 * Query:
 *   - postId (required): target Post _id
 *   - page=1, limit=50
 *   - sort=old|new (default: old -> oldest first, good for building threads)
 *
 * Response: { page, limit, total, items: [ ...comments ] }
 * Each comment item (sanitized):
 *   { _id, post, parent, content, createdAt, likesCount, isDeleted, depth }
 */
router.get("/", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const { postId, page = 1, limit = 50, sort = "old" } = req.query;

    if (!postId) {
      return res.status(400).json({ message: "postId is required." });
    }

    // Ensure post exists & belongs to the same school
    const post = await Post.findOne({ _id: postId, school }).lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const sortObj = sort === "new" ? { createdAt: -1, _id: -1 } : { createdAt: 1, _id: 1 };

    const filter = { school, post: post._id };
    const total = await Comment.countDocuments(filter);

    const docs = await Comment.find(filter)
      .select("_id post parent content createdAt likes isDeleted depth")
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // sanitize
    const items = docs.map((c) => ({
      _id: c._id,
      post: c.post,
      parent: c.parent || null,
      content: c.isDeleted ? "" : (c.content || ""),
      createdAt: c.createdAt,
      likesCount: Array.isArray(c.likes) ? c.likes.length : 0,
      isDeleted: !!c.isDeleted,
      depth: typeof c.depth === "number" ? c.depth : (c.parent ? 1 : 0),
    }));

    res.json({ page: pageNum, limit: limitNum, total, items });
  } catch (err) {
    console.error("[public.comments] list error:", err);
    res.status(500).json({ message: "Failed to load comments." });
  }
});

/**
 * GET /api/public/:school/comments/:id
 * Minimal public detail (read-only)
 */
router.get("/:id", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const id = req.params.id;

    const c = await Comment.findOne(
      { _id: id, school },
      "_id post parent content createdAt likes isDeleted depth"
    ).lean();

    if (!c) return res.status(404).json({ message: "Comment not found." });

    res.json({
      _id: c._id,
      post: c.post,
      parent: c.parent || null,
      content: c.isDeleted ? "" : (c.content || ""),
      createdAt: c.createdAt,
      likesCount: Array.isArray(c.likes) ? c.likes.length : 0,
      isDeleted: !!c.isDeleted,
      depth: typeof c.depth === "number" ? c.depth : (c.parent ? 1 : 0),
    });
  } catch (err) {
    console.error("[public.comments] detail error:", err);
    res.status(500).json({ message: "Failed to load comment." });
  }
});

module.exports = router;
