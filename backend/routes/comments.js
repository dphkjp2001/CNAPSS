// // backend/routes/comments.js
// const express = require("express");
// const router = express.Router();
// const Comment = require("../models/Comment");
// const User = require("../models/User");
// const Post = require("../models/Post");
// const MarketItem = require("../models/MarketItem"); // ✅ 마켓용

// // ✅ 댓글 작성 (일반 + 대댓글)
// router.post("/:postId", async (req, res) => {
//   try {
//     const { email, content, parentId } = req.body;
//     const postId = req.params.postId;

//     if (!postId || !email || !content) {
//       return res.status(400).json({ message: "All fields are required." });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(403).json({ message: "User does not exist." });
//     }

//     const newComment = new Comment({
//       postId,
//       email,
//       nickname: user.nickname,
//       content,
//       parentId: parentId || null,
//     });

//     await newComment.save();
//     res.status(201).json(newComment);
//   } catch (err) {
//     console.error("❌ 댓글 등록 에러:", err);
//     res.status(500).json({ message: "Failed to post comment." });
//   }
// });

// // ✅ 댓글 조회 (type 기반 분기: 자유게시판 vs 마켓)
// router.get("/:postId", async (req, res) => {
//   const viewerEmail = req.query.email || null;
//   const type = req.query.type || "freeboard"; // 기본값은 자유게시판

//   try {
//     const comments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });

//     if (type === "freeboard") {
//       return res.json(comments); // 자유게시판은 모든 댓글 공개
//     }

//     let sellerEmail = null;
//     if (type === "market") {
//       const marketItem = await MarketItem.findById(req.params.postId).lean();
//       sellerEmail = marketItem?.seller;
//     }

//     const processed = comments.map((comment) => {
//       const canView =
//         viewerEmail &&
//         (comment.email === viewerEmail || viewerEmail === sellerEmail);

//       return canView
//         ? comment
//         : {
//             ...comment.toObject(),
//             content: "[🔒 비밀 댓글입니다]",
//             isSecret: true,
//           };
//     });

//     res.json(processed);
//   } catch (err) {
//     console.error("❌ 댓글 조회 실패:", err);
//     res.status(500).json({ message: "Failed to load comments.", error: err.message });
//   }
// });

// // ✅ 댓글 수정
// router.put("/:id", async (req, res) => {
//   const { email, content } = req.body;
//   const { id } = req.params;

//   try {
//     const comment = await Comment.findById(id);
//     if (!comment) return res.status(404).json({ message: "Comment not found." });

//     if (comment.email !== email) {
//       return res.status(403).json({ message: "Only the author can edit this comment." });
//     }

//     comment.content = content;
//     await comment.save();

//     res.json({ message: "Comment updated successfully.", comment });
//   } catch (err) {
//     console.error("댓글 수정 실패:", err);
//     res.status(500).json({ message: "Failed to update comment.", error: err.message });
//   }
// });

// // ✅ 댓글 삭제
// router.delete("/:id", async (req, res) => {
//   const { email } = req.body;
//   const { id } = req.params;

//   try {
//     const comment = await Comment.findById(id);
//     if (!comment) return res.status(404).json({ message: "Comment not found." });

//     if (comment.email !== email) {
//       return res.status(403).json({ message: "Only the author can delete this comment." });
//     }

//     await Comment.findByIdAndDelete(id);
//     res.json({ message: "Comment deleted successfully." });
//   } catch (err) {
//     console.error("댓글 삭제 실패:", err);
//     res.status(500).json({ message: "Failed to delete comment.", error: err.message });
//   }
// });

// // ✅ 댓글 추천 (좋아요 토글)
// router.post("/:id/thumb", async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ message: "Email is required." });

//   try {
//     const comment = await Comment.findById(req.params.id);
//     if (!comment) return res.status(404).json({ message: "Comment not found." });

//     const hasLiked = comment.thumbsUpUsers.includes(email);

//     if (hasLiked) {
//       comment.thumbsUp -= 1;
//       comment.thumbsUpUsers = comment.thumbsUpUsers.filter(e => e !== email);
//     } else {
//       comment.thumbsUp += 1;
//       comment.thumbsUpUsers.push(email);
//     }

//     await comment.save();

//     res.json({
//       message: hasLiked ? "Like removed." : "Liked successfully.",
//       thumbsUp: comment.thumbsUp,
//       liked: !hasLiked,
//     });
//   } catch (err) {
//     console.error("추천 토글 실패:", err);
//     res.status(500).json({ message: "Failed to toggle like.", error: err.message });
//   }
// });

// module.exports = router;



// backend/routes/comments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");

// 🔒 모든 comment 라우트 보호 + 테넌트 일치 강제
router.use(requireAuth, schoolGuard);

/**
 * GET /:postId
 * - 같은 학교의 해당 게시글 댓글 목록
 */
router.get("/:postId", async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  try {
    // post가 같은 학교인지 1차 확인
    const post = await Post.findOne({ _id: postId, school: req.user.school }).select("_id");
    if (!post) return res.status(404).json({ message: "Post not found." });

    const comments = await Comment.find({ postId, school: req.user.school }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    console.error("Load comments error:", err);
    res.status(500).json({ message: "Failed to load comments." });
  }
});

/**
 * POST /:postId
 * - 댓글 작성(대댓글 포함)
 * body: { content, parentId? }
 */
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { content, parentId = null } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  try {
    // 작성자 검증(선택: isVerified)
    const me = await User.findOne({ email: req.user.email });
    if (!me || !me.isVerified) {
      return res.status(403).json({ message: "Only verified users can comment." });
    }

    // 대상 게시글이 같은 학교인지 확인
    const post = await Post.findOne({ _id: postId, school: req.user.school });
    if (!post) return res.status(404).json({ message: "Post not found." });

    // parentId가 있으면 같은 학교/같은 post인지 확인
    let parent = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      parent = await Comment.findOne({ _id: parentId, postId, school: req.user.school });
      if (!parent) return res.status(400).json({ message: "Parent comment not found." });
    }

    const newComment = await Comment.create({
      postId,
      email: req.user.email,
      nickname: me.nickname,
      content,
      parentId: parent ? parent._id : null,
      school: req.user.school, // 🔐 서버 주입
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ message: "Failed to create comment." });
  }
});

/**
 * PUT /:id
 * - 댓글 수정 (작성자 본인 또는 superadmin)
 * body: { content }
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await Comment.findOne({ _id: id, school: req.user.school });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only edit your own comments." });
    }

    comment.content = content;
    await comment.save();
    res.json({ message: "Comment updated successfully.", comment });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ message: "Failed to update comment." });
  }
});

/**
 * DELETE /:id
 * - 댓글 삭제 (작성자 본인 또는 superadmin)
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await Comment.findOne({ _id: id, school: req.user.school });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (comment.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    await Comment.deleteOne({ _id: comment._id });
    res.json({ message: "Comment deleted successfully." });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Failed to delete comment." });
  }
});

/**
 * POST /:id/thumbs
 * - 댓글 좋아요 토글 (내 계정)
 * - `thumbsUpUsers` 기준으로 토글하고, `thumbsUp` 숫자 동기화
 */
router.post("/:id/thumbs", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  try {
    const comment = await Comment.findOne({ _id: id, school: req.user.school });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const me = req.user.email;
    const list = comment.thumbsUpUsers || [];
    const idx = list.indexOf(me);

    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(me);
    }
    comment.thumbsUpUsers = list;
    comment.thumbsUp = list.length; // 동기화

    await comment.save();
    res.json({ thumbsUpCount: comment.thumbsUp });
  } catch (err) {
    console.error("Toggle comment like error:", err);
    res.status(500).json({ message: "Failed to toggle like." });
  }
});

module.exports = router;


