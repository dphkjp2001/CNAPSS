// backend/routes/votes.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");

const router = express.Router();

function pickSchool(req){ return (req.params && req.params.school) || (req.user && req.user.school) || req.query.school; }

// 공통 투표 처리
async function applyVote({ school, userId, targetType, targetId, nextValue }) {
  // nextValue: 1 | -1 | 0 (0 = 취소)
  const prev = await Vote.findOne({ school, targetType, targetId, userId });
  let diffUp = 0, diffDown = 0, myVote = 0;

  if (nextValue === 0) {
    if (prev) {
      if (prev.value === 1) diffUp -= 1;
      if (prev.value === -1) diffDown -= 1;
      await prev.deleteOne();
    }
  } else if (prev) {
    if (prev.value === nextValue) {
      // 같은 버튼 재클릭 → 취소
      if (prev.value === 1) diffUp -= 1; else diffDown -= 1;
      await prev.deleteOne();
    } else {
      // 반대값으로 변경
      if (nextValue === 1) { diffUp += 1; diffDown -= 1; }
      else { diffUp -= 1; diffDown += 1; }
      prev.value = nextValue;
      await prev.save();
      myVote = nextValue;
    }
  } else {
    // 신규 투표
    if (nextValue === 1) diffUp += 1; else diffDown += 1;
    await Vote.create({ school, userId, targetType, targetId, value: nextValue });
    myVote = nextValue;
  }

  // 카운터 반영
  if (targetType === "post") {
    await Post.updateOne({ _id: targetId }, {
      $inc: { "counts.up": diffUp, "counts.down": diffDown }
    });
    const p = await Post.findById(targetId).lean();
    return { upvotes: p.counts?.up || 0, downvotes: p.counts?.down || 0, score: (p.counts?.up || 0) - (p.counts?.down || 0), myVote };
  } else {
    await Comment.updateOne({ _id: targetId }, {
      $inc: { "counts.up": diffUp, "counts.down": diffDown }
    });
    const c = await Comment.findById(targetId).lean();
    return { upvotes: c.counts?.up || 0, downvotes: c.counts?.down || 0, score: (c.counts?.up || 0) - (c.counts?.down || 0), myVote };
  }
}

// 게시글 투표
router.post(["/posts/:id/vote", "/:school/posts/:id/vote"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { value } = req.body || {};
  if (![1, -1, 0].includes(Number(value))) return res.status(400).json({ message: "Invalid vote value" });
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.school !== school) return res.status(403).json({ message: "School mismatch" });

  const result = await applyVote({ school, userId: req.user._id, targetType: "post", targetId: post._id, nextValue: Number(value) });
  res.json(result);
});

// 댓글 투표
router.post(["/comments/:id/vote", "/:school/comments/:id/vote"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { value } = req.body || {};
  if (![1, -1, 0].includes(Number(value))) return res.status(400).json({ message: "Invalid vote value" });
  const c = await Comment.findById(req.params.id).lean();
  if (!c) return res.status(404).json({ message: "Comment not found" });
  if (c.school !== school) return res.status(403).json({ message: "School mismatch" });

  const result = await applyVote({ school, userId: req.user._id, targetType: "comment", targetId: c._id, nextValue: Number(value) });
  res.json(result);
});

module.exports = router;
