// backend/routes/notification.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const Comment = require("../models/Comment");
const Post = require("../models/Post");

/**
 * 🔔 알림 목록
 * GET /api/:school/notification?minutes=5
 * - 내 글/내 댓글에 달린 "안읽은" 새 댓글(같은 학교만)
 */
router.get("/", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const email = String(req.user?.email || "").toLowerCase();
  const minutes = Math.max(1, Number(req.query.minutes) || 5);

  try {
    const [myPosts, myComments] = await Promise.all([
      Post.find({ email, school }).select("_id").lean(),
      Comment.find({ email, school }).select("_id").lean(),
    ]);
    const postIds = myPosts.map((p) => p._id);
    const commentIds = myComments.map((c) => c._id);

    const since = new Date(Date.now() - minutes * 60 * 1000);

    const unreadNewComments = await Comment.find({
      school,
      $or: [{ postId: { $in: postIds } }, { parentId: { $in: commentIds } }],
      email: { $ne: email },
      createdAt: { $gt: since },
      readBy: { $ne: email }, // 본인이 안 읽은 것만
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(unreadNewComments);
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/**
 * 🔖 단건 읽음 처리
 * POST /api/:school/notification/mark-read { commentId }
 */
router.post("/mark-read", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const email = String(req.user?.email || "").toLowerCase();
  const { commentId } = req.body;

  if (!commentId) return res.status(400).json({ message: "Missing commentId" });

  try {
    await Comment.updateOne(
      { _id: commentId, school },
      { $addToSet: { readBy: email } } // idempotent
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to mark as read:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

/**
 * 📦 모두 읽음 처리
 * POST /api/:school/notification/mark-all-read { minutes?=5 }
 */
router.post("/mark-all-read", async (req, res) => {
  const school = String(req.params.school || "").toLowerCase();
  const email = String(req.user?.email || "").toLowerCase();
  const minutes = Math.max(1, Number(req.body.minutes) || 5);

  try {
    const [myPosts, myComments] = await Promise.all([
      Post.find({ email, school }).select("_id").lean(),
      Comment.find({ email, school }).select("_id").lean(),
    ]);
    const postIds = myPosts.map((p) => p._id);
    const commentIds = myComments.map((c) => c._id);
    const since = new Date(Date.now() - minutes * 60 * 1000);

    await Comment.updateMany(
      {
        school,
        $or: [{ postId: { $in: postIds } }, { parentId: { $in: commentIds } }],
        email: { $ne: email },
        createdAt: { $gt: since },
        readBy: { $ne: email },
      },
      { $addToSet: { readBy: email } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to mark all as read:", err);
    res.status(500).json({ message: "Failed to mark all read" });
  }
});

module.exports = router;

