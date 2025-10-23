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
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
// const CareerPost = require("../models/CareerPost");
const AcademicPost = require("../models/AcademicPost");
const User = require("../models/User");

router.use(requireAuth, schoolGuard);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Find target post across multiple boards within the same school.
 * Supports: Freeboard(Post), CareerPost, AcademicPost
 */
async function findAnyPostById(postId, school) {
  const [free, career, academic] = await Promise.all([
    Post.findOne({ _id: postId, school }).select("_id").lean(),
    CareerPost.findOne({ _id: postId, school }).select("_id").lean(),
    AcademicPost.findOne({ _id: postId, school }).select("_id").lean(),
  ]);
  return free || career || academic;
}

// GET /api/:school/comments/:postId
router.get("/:postId", async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }
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

// POST /api/:school/comments/:postId
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  let { content, parentId = null } = req.body;
  content = String(content || "").trim();

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }
  if (!content) return res.status(400).json({ message: "Content required" });

  try {
    const me = await User.findOne({ email: req.user.email });
    if (!me || !me.isVerified) {
      return res.status(403).json({ message: "Only verified users can comment." });
    }

    const target = await findAnyPostById(postId, req.user.school);
    if (!target) return res.status(404).json({ message: "Post not found." });

    let parent = null;
    if (parentId) {
      if (!isValidObjectId(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      parent = await Comment.findOne({ _id: parentId, postId, school: req.user.school });
      if (!parent) return res.status(400).json({ message: "Parent comment not found." });
    }

    const doc = await Comment.create({
      postId,
      email: req.user.email,
      nickname: me.nickname,
      content,
      parentId: parent ? parent._id : null,
      school: req.user.school,
    });

    // Realtime broadcast
    try {
      const io = req.app.get("io");
      if (io) {
        const out = doc.toObject();
        io.to(`post:${postId}`).emit("comment:new", out);
      }
    } catch (_) {}

    res.status(201).json(doc);
  } catch (e) {
    console.error("comments:create", e);
    res.status(500).json({ message: "Failed to add comment." });
  }
});

// PUT /api/:school/comments/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  let { content } = req.body;
  content = String(content || "").trim();

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }
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
      if (io) {
        io.to(`post:${comment.postId}`).emit("comment:update", comment.toObject());
      }
    } catch (_) {}

    res.json(comment);
  } catch (e) {
    console.error("comments:update", e);
    res.status(500).json({ message: "Failed to update comment." });
  }
});

// DELETE /api/:school/comments/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid comment id" });
  }
  try {
    const owned = await Comment.findOne({ _id: id, school: req.user.school }).select("email postId");
    if (!owned) return res.status(404).json({ message: "Comment not found." });
    if (owned.email !== req.user.email && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    await Comment.deleteOne({ _id: id, school: req.user.school });

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

// POST /api/:school/comments/:commentId/thumbs
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
