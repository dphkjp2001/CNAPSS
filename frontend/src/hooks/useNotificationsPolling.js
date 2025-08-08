// frontend/src/hooks/useNotificationsPolling.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");

// 🔔 알림 목록 (내 글/내 댓글에 달린 "안읽은" 새 댓글만)
// GET /api/notification/:email?minutes=5
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  const minutes = Math.max(1, Number(req.query.minutes) || 5); // 기본 5분

  try {
    // 내가 쓴 글/댓글 목록
    const [myPosts, myComments] = await Promise.all([
      Post.find({ email }).select("_id").lean(),
      Comment.find({ email }).select("_id").lean(),
    ]);
    const postIds = myPosts.map((p) => p._id);
    const commentIds = myComments.map((c) => c._id);

    // 최근 N분 내 + 내가 단 댓글 제외 + "아직 내가 안 읽은" 댓글만
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const unreadNewComments = await Comment.find({
      $or: [
        { postId: { $in: postIds } },     // 내 글에 달린 댓글
        { parentId: { $in: commentIds } } // 내 댓글에 달린 대댓글
      ],
      email: { $ne: email },               // 내가 단 댓글 제외
      createdAt: { $gt: since },           // 최근 N분
      readBy: { $ne: email },              // ✅ 내가 아직 안 읽은 것만!
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(unreadNewComments);
  } catch (err) {
    console.error("❌ 알림 불러오기 실패:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// 🔖 단건 읽음 처리
// POST /api/notification/mark-read  { commentId, email }
router.post("/mark-read", async (req, res) => {
  const { commentId, email } = req.body;
  if (!commentId || !email) {
    return res.status(400).json({ message: "Missing commentId or email" });
  }
  try {
    await Comment.findByIdAndUpdate(commentId, {
      $addToSet: { readBy: email }, // 중복 방지
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ 읽음 처리 실패:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

// (선택) 모두 읽음 처리
// POST /api/notification/mark-all-read  { email, minutes?=5 }
router.post("/mark-all-read", async (req, res) => {
  const { email } = req.body;
  const minutes = Math.max(1, Number(req.body.minutes) || 5);
  if (!email) return res.status(400).json({ message: "Missing email" });

  try {
    const [myPosts, myComments] = await Promise.all([
      Post.find({ email }).select("_id").lean(),
      Comment.find({ email }).select("_id").lean(),
    ]);
    const postIds = myPosts.map((p) => p._id);
    const commentIds = myComments.map((c) => c._id);
    const since = new Date(Date.now() - minutes * 60 * 1000);

    await Comment.updateMany(
      {
        $or: [{ postId: { $in: postIds } }, { parentId: { $in: commentIds } }],
        email: { $ne: email },
        createdAt: { $gt: since },
        readBy: { $ne: email },
      },
      { $addToSet: { readBy: email } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ 전체 읽음 처리 실패:", err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

module.exports = router;
