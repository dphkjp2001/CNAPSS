// backend/routes/notification.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");

// 🔔 알림 목록 가져오기 (내 글/댓글에 달린 새 댓글들)
router.get("/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // 내가 쓴 글 ID 목록
    const myPosts = await Post.find({ email }).select("_id");
    const postIds = myPosts.map(p => p._id);

    // 내가 쓴 댓글 ID 목록
    const myComments = await Comment.find({ email }).select("_id");
    const commentIds = myComments.map(c => c._id);

    // 최근 1분 이내에 내가 쓴 글 or 댓글에 달린 댓글
    const recent = new Date(Date.now() - 1000 * 60); // 최근 60초 기준
    const newComments = await Comment.find({
      $or: [
        { postId: { $in: postIds } },
        { parentId: { $in: commentIds } }
      ],
      email: { $ne: email }, // 내가 단 댓글은 제외
      createdAt: { $gt: recent }
    }).sort({ createdAt: -1 });

    res.json(newComments);
  } catch (err) {
    console.error("알림 불러오기 실패:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});


router.post("/mark-read", async (req, res) => {
    const { commentId, email } = req.body;
  
    try {
      await Comment.findByIdAndUpdate(commentId, {
        $addToSet: { readBy: email },
      });
  
      res.json({ message: "Marked as read" });
    } catch (err) {
      console.error("읽음 처리 실패:", err);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  

module.exports = router;
