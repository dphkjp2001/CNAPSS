// backend/routes/comments.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const AcademicPost = require("../models/AcademicPost");
const User = require("../models/User");

router.use(requireAuth, schoolGuard);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function findAnyPostById(postId, school) {
  const [free, academic] = await Promise.all([
    Post.findOne({ _id: postId, school }).select("_id board").lean(),
    AcademicPost.findOne({ _id: postId, school }).select("_id").lean(),
  ]);
  if (free) return { type: "free", doc: free };
  if (academic) return { type: "academic", doc: academic };
  return null;
}

// GET comments
router.get("/:postId", async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) return res.status(400).json({ message: "Invalid postId" });
  try {
    const target = await findAnyPostById(postId, req.user.school);
    if (!target) return res.status(404).json({ message: "Post not found." });

    const items = await Comment.find({ postId, school: req.user.school })
      .sort({ createdAt: 1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error("comments:list", e);
    res.status(500).json({ message: "Failed to load comments." });
  }
});

// POST comment
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) return res.status(400).json({ message: "Invalid postId" });

  let { content, parentId = null } = req.body;
  content = String(content || "").trim();
  if (!content) return res.status(400).json({ message: "Content required" });

  try {
    const me = await User.findOne({ email: req.user.email }).lean();
    if (!me || !me.isVerified) {
      return res.status(403).json({ message: "Only verified users can comment." });
    }

    const target = await findAnyPostById(postId, req.user.school);
    if (!target) return res.status(404).json({ message: "Post not found." });

    let parent = null;
    if (parentId) {
      if (!isValidObjectId(parentId)) return res.status(400).json({ message: "Invalid parentId" });
      parent = await Comment.findOne({ _id: parentId, postId, school: req.user.school });
      if (!parent) return res.status(400).json({ message: "Parent comment not found." });
    }

    const doc = await Comment.create({
      postId,
      school: req.user.school,
      authorId: me._id,
      email: req.user.email,
      nickname: me.nickname,
      content,
      parentId: parent ? parent._id : null,
    });

    // ✅ commentCount +1
    if (target.type === "free") {
      await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
    } else if (target.type === "academic") {
      await AcademicPost.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
    }

    try {
      const io = req.app.get("io");
      if (io) io.to(`post:${postId}`).emit("comment:new", doc.toObject());
    } catch (_) {}

    res.status(201).json(doc);
  } catch (e) {
    console.error("comments:create", e);
    res.status(500).json({ message: "Failed to add comment." });
  }
});

// PUT comment
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid comment id" });

  let { content } = req.body;
  content = String(content || "").trim();
  if (!content) return res.status(400).json({ message: "Content required" });

  try {
    const comment = await Comment.findOne({ _id: id, school: req.user.school });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own comments." });
    }

    comment.content = content;
    await comment.save();

    try {
      const io = req.app.get("io");
      if (io) io.to(`post:${comment.postId}`).emit("comment:update", comment.toObject());
    } catch (_) {}

    res.json(comment);
  } catch (e) {
    console.error("comments:update", e);
    res.status(500).json({ message: "Failed to update comment." });
  }
});

// DELETE comment
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid comment id" });
  try {
    const owned = await Comment.findOne({ _id: id, school: req.user.school }).select("email postId");
    if (!owned) return res.status(404).json({ message: "Comment not found." });
    if (owned.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    const target = await findAnyPostById(owned.postId, req.user.school);

    await Comment.deleteOne({ _id: id, school: req.user.school });

    // ✅ commentCount -1
    if (target?.type === "free") {
      await Post.updateOne({ _id: owned.postId }, { $inc: { commentCount: -1 } });
    } else if (target?.type === "academic") {
      await AcademicPost.updateOne({ _id: owned.postId }, { $inc: { commentCount: -1 } });
    }

    try {
      const io = req.app.get("io");
      if (io) io.to(`post:${owned.postId}`).emit("comment:delete", { _id: id });
    } catch (_) {}

    res.json({ ok: true });
  } catch (e) {
    console.error("comments:delete", e);
    res.status(500).json({ message: "Failed to delete comment." });
  }
});

// thumbs 그대로 유지
router.post("/:commentId/thumbs", async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const email = String(req.user.email || "").toLowerCase();

    const cur = await Comment.findOne({ _id: commentId, school: req.user.school })
      .select("email thumbsUpUsers postId")
      .lean();
    if (!cur) return res.status(404).json({ message: "Not found" });

    if (String(cur.email || "").toLowerCase() === email) {
      return res.status(400).json({ message: "You cannot like your own comment." });
    }

    const has = (cur.thumbsUpUsers || [])
      .map((e) => String(e || "").toLowerCase())
      .includes(email);

    const update = has
      ? { $pull: { thumbsUpUsers: email } }
      : { $addToSet: { thumbsUpUsers: email } };

    const next = await Comment.findOneAndUpdate(
      { _id: commentId, school: req.user.school },
      update,
      { new: true, lean: true }
    );

    try {
      const io = req.app.get("io");
      if (io) io.to(`post:${cur.postId}`).emit("comment:thumbs", { _id: commentId, thumbs: next.thumbsUpUsers || [] });
    } catch (_) {}

    const arr = next.thumbsUpUsers || [];
    res.json({ thumbs: arr, count: arr.length });
  } catch (e) {
    console.error("comments:thumbs", e);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

module.exports = router;



