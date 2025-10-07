// backend/routes/requests.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const Post = require("../models/Post");
const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const { emitToUsers } = require("../sockets/realtime");
const { pushNotification } = require("../services/notify.service");

const router = express.Router();
const pickSchool = (req) => (req.params?.school) || (req.user?.school) || req.query.school;

// 생성
router.post(["/requests", "/:school/requests"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { postId, message = "" } = req.body || {};
  if (!postId) return res.status(400).json({ message: "Missing postId" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.school !== school) return res.status(403).json({ message: "School mismatch" });
  if (!(post.board === "academic" && post.type === "looking")) {
    return res.status(400).json({ message: "Target post must be Academic:Looking For" });
  }
  if (String(post.authorId) === String(req.user._id)) {
    return res.status(400).json({ message: "Cannot request your own post" });
  }

  try {
    const doc = await Request.create({
      school, postId: post._id, requesterId: req.user._id, message
    });

    // 알림: 글쓴이에게 "요청 도착"
    await pushNotification({
      school,
      toUserId: post.authorId,
      type: "request_created",
      data: { requestId: doc._id, postId: post._id }
    });

    emitToUsers([post.authorId], "request:new", { requestId: doc._id, postId: post._id });
    res.status(201).json(doc);
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Already requested" });
    console.error(e);
    res.status(500).json({ message: "Failed to create request" });
  }
});

// 목록(동일)
router.get(["/requests", "/:school/requests"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { mine } = req.query || {};
  let filter = { school };
  if (mine === "sent") filter.requesterId = req.user._id;
  if (mine === "received") {
    const myLookingPosts = await Post.find({ school, authorId: req.user._id, board: "academic", type: "looking" })
      .select("_id").lean();
    filter.postId = { $in: myLookingPosts.map(p => p._id) };
  }
  const list = await Request.find(filter).sort({ createdAt: -1 }).lean();
  res.json(list);
});

// 상태 변경
router.patch(["/requests/:id", "/:school/requests/:id"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { action } = req.body || {};
  const r = await Request.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ message: "Request not found" });
  if (r.school !== school) return res.status(403).json({ message: "School mismatch" });

  const post = await Post.findById(r.postId);
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (action === "cancel") {
    if (String(r.requesterId) !== String(req.user._id)) return res.status(403).json({ message: "Not your request" });
    await Request.updateOne({ _id: r._id }, { $set: { status: "cancelled" } });

    // 글쓴이에게 알림
    await pushNotification({
      school,
      toUserId: post.authorId,
      type: "request_cancelled",
      data: { requestId: r._id, postId: post._id }
    });

    emitToUsers([post.authorId], "request:cancelled", { requestId: r._id, postId: post._id });
    return res.json({ ok: true, status: "cancelled" });
  }

  if (action === "accept") {
    if (String(post.authorId) !== String(req.user._id)) return res.status(403).json({ message: "Not your post" });
    await Request.updateOne({ _id: r._id }, { $set: { status: "accepted" } });

    // DM 자동 생성
    const A = post.authorId, B = r.requesterId;
    let convo = await Conversation.findOne({
      school,
      participants: { $all: [{ $elemMatch: { userId: A } }, { $elemMatch: { userId: B } }] }
    });
    if (!convo) {
      convo = await Conversation.create({
        school,
        participants: [{ userId: A }, { userId: B }],
        lastMessageAt: new Date()
      });
    }

    // 요청자에게 알림: 수락
    await pushNotification({
      school,
      toUserId: r.requesterId,
      type: "request_accepted",
      data: { requestId: r._id, postId: post._id, conversationId: convo._id }
    });

    emitToUsers([A, B], "request:accepted", { requestId: r._id, postId: post._id, conversationId: convo._id });
    return res.json({ ok: true, status: "accepted", conversationId: convo._id });
  }

  if (action === "reject") {
    if (String(post.authorId) !== String(req.user._id)) return res.status(403).json({ message: "Not your post" });
    await Request.updateOne({ _id: r._id }, { $set: { status: "rejected" } });

    await pushNotification({
      school,
      toUserId: r.requesterId,
      type: "request_rejected",
      data: { requestId: r._id, postId: post._id }
    });

    emitToUsers([r.requesterId], "request:rejected", { requestId: r._id, postId: post._id });
    return res.json({ ok: true, status: "rejected" });
  }

  res.status(400).json({ message: "Invalid action" });
});

module.exports = router;

