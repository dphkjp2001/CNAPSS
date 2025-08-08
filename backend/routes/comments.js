// backend/routes/comments.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const User = require("../models/User");
const Post = require("../models/Post");
const MarketItem = require("../models/MarketItem"); // ✅ 마켓용
const Notification = require("../models/Notification");


// ✅ 댓글 작성 (일반 + 대댓글)
router.post("/:postId", async (req, res) => {
  try {
    const { email, content, parentId } = req.body;
    const postId = req.params.postId;

    if (!postId || !email || !content) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: "User does not exist." });
    }

    const newComment = new Comment({
      postId,
      email,
      nickname: user.nickname,
      content,
      parentId: parentId || null,
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (err) {
    console.error("❌ 댓글 등록 에러:", err);
    res.status(500).json({ message: "Failed to post comment." });
  }
});

// ✅ 댓글 조회 (type 기반 분기: 자유게시판 vs 마켓)
router.get("/:postId", async (req, res) => {
  const viewerEmail = req.query.email || null;
  const type = req.query.type || "freeboard"; // 기본값은 자유게시판

  try {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });

    if (type === "freeboard") {
      return res.json(comments); // 자유게시판은 모든 댓글 공개
    }

    let sellerEmail = null;
    if (type === "market") {
      const marketItem = await MarketItem.findById(req.params.postId).lean();
      sellerEmail = marketItem?.seller;
    }

    const processed = comments.map((comment) => {
      const canView =
        viewerEmail &&
        (comment.email === viewerEmail || viewerEmail === sellerEmail);

      return canView
        ? comment
        : {
            ...comment.toObject(),
            content: "[🔒 비밀 댓글입니다]",
            isSecret: true,
          };
    });

    res.json(processed);
  } catch (err) {
    console.error("❌ 댓글 조회 실패:", err);
    res.status(500).json({ message: "Failed to load comments.", error: err.message });
  }
});

// ✅ 댓글 수정
router.put("/:id", async (req, res) => {
  const { email, content } = req.body;
  const { id } = req.params;

  try {
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.email !== email) {
      return res.status(403).json({ message: "Only the author can edit this comment." });
    }

    comment.content = content;
    await comment.save();

    res.json({ message: "Comment updated successfully.", comment });
  } catch (err) {
    console.error("댓글 수정 실패:", err);
    res.status(500).json({ message: "Failed to update comment.", error: err.message });
  }
});

// ✅ 댓글 삭제
router.delete("/:id", async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  try {
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.email !== email) {
      return res.status(403).json({ message: "Only the author can delete this comment." });
    }

    await Comment.findByIdAndDelete(id);
    res.json({ message: "Comment deleted successfully." });
  } catch (err) {
    console.error("댓글 삭제 실패:", err);
    res.status(500).json({ message: "Failed to delete comment.", error: err.message });
  }
});

// ✅ 댓글 추천 (좋아요 토글)
router.post("/:id/thumb", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const hasLiked = comment.thumbsUpUsers.includes(email);

    if (hasLiked) {
      comment.thumbsUp -= 1;
      comment.thumbsUpUsers = comment.thumbsUpUsers.filter(e => e !== email);
    } else {
      comment.thumbsUp += 1;
      comment.thumbsUpUsers.push(email);
    }

    await comment.save();

    res.json({
      message: hasLiked ? "Like removed." : "Liked successfully.",
      thumbsUp: comment.thumbsUp,
      liked: !hasLiked,
    });
  } catch (err) {
    console.error("추천 토글 실패:", err);
    res.status(500).json({ message: "Failed to toggle like.", error: err.message });
  }
});


// 예: POST /comments
router.post("/", async (req, res) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user._id; // auth 미들웨어로 들어왔다고 가정

    // 1) 댓글 저장 (기존 로직)
    const comment = await Comment.create({
      post: postId,
      author: userId,
      content,
    });

    // 2) 알림 생성 대상 찾기
    const post = await Post.findById(postId).select("author title");
    if (post && String(post.author) !== String(userId)) {
      const notif = await Notification.create({
        recipient: post.author,
        actor: userId,
        type: "comment",
        post: postId,
        comment: comment._id,
        message: "Someone commented on your post.",
        meta: { postTitle: post.title },
      });

      // 3) 소켓으로 푸시 (유저별 room = userId)
      const io = req.app.get("io"); // server.js에서 app.set('io', io) 해둬야 함
      io.to(String(post.author)).emit("notification:new", {
        _id: notif._id,
        type: notif.type,
        message: notif.message,
        post: notif.post,
        comment: notif.comment,
        createdAt: notif.createdAt,
        meta: notif.meta,
      });
    }

    res.status(201).json(comment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

module.exports = router;



