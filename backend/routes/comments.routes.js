// backend/routes/comments.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const { commentCooldown } = require("../middleware/commentCooldown");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const { RULES, addPoints } = require("../services/points.service");
const { buildCommentAliasMap } = require("../utils/anon");
const { pushNotification } = require("../services/notify.service");

const router = express.Router();
const pickSchool = (req) => (req.params?.school) || (req.user?.school) || req.query.school;

function shapeCommentForClient({ comment, post, myVote, aliasMap, me }) {
  const isPostAuthor = String(comment.authorId) === String(post.authorId);
  const authorAlias = isPostAuthor ? "anonymous(OP)" : (aliasMap.get(String(comment.authorId)) || "anonymous1");
  const score = (comment.counts?.up || 0) - (comment.counts?.down || 0);
  return {
    _id: comment._id,
    postId: comment.postId,
    parentId: comment.parentId || null,
    body: comment.body,
    counts: comment.counts || { up:0, down:0 },
    score,
    myVote,
    isMine: String(comment.authorId) === String(me),
    authorAlias,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

// LIST
router.get(["/posts/:postId/comments", "/:school/posts/:postId/comments"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const post = await Post.findById(req.params.postId).lean();
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.school !== school) return res.status(403).json({ message: "School mismatch" });

  const list = await Comment.find({ school, postId: post._id }).sort({ createdAt: 1 }).lean();
  const aliasMap = buildCommentAliasMap({ comments: list, postAuthorId: post.authorId });

  const ids = list.map(c => c._id);
  const myVotes = await Vote.find({ school, targetType: "comment", targetId: { $in: ids }, userId: req.user._id }).lean();
  const map = new Map(myVotes.map(v => [String(v.targetId), v.value]));

  res.json(list.map(c => shapeCommentForClient({ comment: c, post, myVote: map.get(String(c._id)) || 0, aliasMap, me: req.user._id })));
});

// CREATE (+ cooldown + points + notification)
router.post(
  ["/posts/:postId/comments", "/:school/posts/:postId/comments"],
  requireAuth, ensureSchoolScope, commentCooldown(60),
  async (req, res) => {
    const school = pickSchool(req);
    const { body, parentId = null, anonymous = true } = req.body || {};
    if (!body) return res.status(400).json({ message: "Missing body" });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.school !== school) return res.status(403).json({ message: "School mismatch" });
    if (post.board === "academic" && post.type === "looking") {
      return res.status(400).json({ message: "Comments disabled for looking-for posts" });
    }

    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent || String(parent.postId) !== String(post._id)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
    }

    const c = await Comment.create({
      school, postId: post._id, parentId, authorId: req.user._id, anonymous, body
    });
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

    // 포인트
    if (post.board === "free") await addPoints({ userId: req.user._id, reason: "free_comment", delta: RULES.FREE_COMMENT });
    if (post.board === "academic") await addPoints({ userId: req.user._id, reason: "ac_comment",   delta: RULES.AC_COMMENT });

    // 알림: 내 글에 남이 댓글 달았을 때만
    if (String(req.user._id) !== String(post.authorId)) {
      await pushNotification({
        school,
        toUserId: post.authorId,
        type: "comment_on_post",
        data: { postId: post._id, commentId: c._id }
      });
    }

    // 응답(번호 일관성 위해 재계산)
    const list = await Comment.find({ school, postId: post._id }).sort({ createdAt: 1 }).lean();
    const aliasMap = buildCommentAliasMap({ comments: list, postAuthorId: post.authorId });
    const shaped = list.find(x => String(x._id) === String(c._id));

    res.status(201).json(
      shapeCommentForClient({ comment: shaped, post, myVote: 0, aliasMap, me: req.user._id })
    );
  }
);

// DELETE (동일)
router.delete(["/comments/:id", "/:school/comments/:id"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const root = await Comment.findById(req.params.id);
  if (!root) return res.status(404).json({ message: "Comment not found" });
  if (root.school !== school) return res.status(403).json({ message: "School mismatch" });
  if (String(root.authorId) !== String(req.user._id)) return res.status(403).json({ message: "Not the author" });

  const toDelete = [root._id];
  for (let i = 0; i < toDelete.length; i++) {
    const children = await Comment.find({ parentId: toDelete[i] }).select("_id").lean();
    for (const ch of children) toDelete.push(ch._id);
  }
  const n = toDelete.length;

  await Vote.deleteMany({ school, targetType: "comment", targetId: { $in: toDelete } });
  await Comment.deleteMany({ _id: { $in: toDelete } });
  await Post.updateOne({ _id: root.postId }, { $inc: { commentCount: -n } });

  res.json({ ok: true, removed: n });
});

module.exports = router;



