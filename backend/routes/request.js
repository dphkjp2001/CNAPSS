// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");

const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
<<<<<<< HEAD
const CareerPost = require("../models/CareerPost");
=======
const AcademicPost = require("../models/AcademicPost");
const User = require("../models/User");
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const router = express.Router({ mergeParams: true });

<<<<<<< HEAD
// 모든 라우트는 app.js에서 requireAuth + schoolGuard가 이미 걸려있지만,
// 직접 접근 시를 대비해 한 번 더 보강
=======
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
router.use(requireAuth, schoolGuard);

/**
 * POST /api/:school/request
<<<<<<< HEAD
 * Academic "Looking for" 글에 대한 요청(=첫 메시지) 생성
 * body: { targetId, initialMessage }
 * 결과: { ok, requestId, conversationId }
 */
router.post("/", async (req, res) => {
  try {
    const school = req.params.school;
    const userEmail = (req.user?.email || "").toLowerCase();
    const { targetId, initialMessage } = req.body || {};

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid targetId." });
    }

    const post = await CareerPost.findById(targetId).lean();
    if (!post) return res.status(404).json({ error: "Post not found." });
    if ((post.school || "").toLowerCase() !== (school || "").toLowerCase()) {
      return res.status(403).json({ error: "School scope mismatch." });
    }

    const authorEmail = String(post.email || "").toLowerCase();
    if (!authorEmail) return res.status(400).json({ error: "Post has no author." });

    // 오직 'looking_for' 타입만 허용
    const postType = String(post.postType || post.type || "").toLowerCase();
    if (postType !== "looking_for") {
      return res.status(400).json({ error: "Only 'looking for' posts accept requests." });
    }

    if (authorEmail === userEmail) {
      return res.status(400).json({ error: "You cannot send a request to your own post." });
    }

    // 중복 요청 방지
    const exists = await Request.findOne({ targetId, fromUser: userEmail });
    if (exists) {
      return res.status(409).json({
        error: "You have already requested.",
        requestId: exists._id,
        conversationId: exists.conversationId,
      });
    }

    // 대화가 이미 있는지 탐색(양방향)
=======
 * body: { targetId, initialMessage }
 * result: { ok, requestId, conversationId }
 */
router.post("/", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const { targetId, initialMessage } = req.body || {};

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid targetId." });
    }

    const post = await AcademicPost.findOne({ _id: targetId, school })
      .populate("author", "email _id")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found." });

    const authorId = post.author?._id;
    const authorEmail = String(post.author?.email || "").toLowerCase();
    const userId = req.user._id;
    const userEmail = String(req.user.email || "").toLowerCase();

    // Only 'looking_for' posts accept requests
    const postMode = String(post.mode || post.postType || post.type || "").toLowerCase();
    if (!(postMode === "looking_for" || postMode === "seeking")) {
      return res.status(400).json({ message: "Only 'looking for' posts accept requests." });
    }
    if (!authorId || authorEmail === userEmail) {
      return res.status(400).json({ message: "Invalid target user." });
    }

    // prevent duplicates
    const exists = await Request.findOne({ school, targetId, fromUser: userId });
    if (exists) {
      return res
        .status(409)
        .json({ message: "Request already sent.", requestId: exists._id, conversationId: exists.conversationId });
    }

    // find or create conversation
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
    let convo = await Conversation.findOne({
      school,
      $or: [
        { buyer: userEmail, seller: authorEmail },
        { buyer: authorEmail, seller: userEmail },
      ],
<<<<<<< HEAD
      // 특정 글 기준으로 묶을 수 있으면 좋지만, itemId 필드가 없을 수도 있어 optional
      $orIgnore: true,
    });

    if (!convo) {
      // 새 대화 생성
=======
    });

    if (!convo) {
      // always create as "looking_for" (legacy routes will be normalized by model anyway)
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
      convo = await Conversation.create({
        school,
        buyer: userEmail,
        seller: authorEmail,
<<<<<<< HEAD
        // 기존 스키마에 없을 수도 있는 필드이므로 optional
        source: "academic_looking_for",
        itemId: targetId,
=======
        source: "looking_for",
        itemId: targetId, // optional
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
        resourceTitle: post.title || "Looking for",
        lastMessage: "",
      });
    }

<<<<<<< HEAD
    // 첫 메시지 생성
    const text = (initialMessage || "").trim() || "Hi! I'm interested in your post.";
    const msg = await Message.create({
      conversationId: convo._id,
      sender: userEmail,
      content: text,
      school,
    });

    // 대화 갱신
=======
    const text = (initialMessage || "").trim() || "Hi! I'm interested in your post.";
    await Message.create({ conversationId: convo._id, sender: userEmail, content: text, school });

>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
    convo.lastMessage = text;
    convo.updatedAt = new Date();
    await convo.save();

<<<<<<< HEAD
    // Request 레코드 (자동 수락된 상태로 기록)
    const reqDoc = await Request.create({
      school,
      targetType: "career_post",
      targetId,
      fromUser: userEmail,
      toUser: authorEmail,
      initialMessage: text,
      status: "accepted",
      conversationId: convo._id,
    });

    // 소켓 알림(상대방 목록 갱신)
    try {
      const io = req.app.get("io");
      if (io) {
        // 대화방 참여자들에게 미리보기 전달
=======
    const reqDoc = await Request.create({
      school,
      targetType: "academic_post",
      targetId,
      fromUser: userId,
      toUser: authorId,
      type: "academic_request",
      status: "accepted",
      message: text,
      conversationId: convo._id,
    });

    // best-effort socket notify
    try {
      const io = req.app.get("io");
      if (io) {
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
        io.to(`user:${authorEmail}`).emit("chat:preview", {
          conversationId: String(convo._id),
          lastMessage: text,
          updatedAt: convo.updatedAt,
        });
      }
<<<<<<< HEAD
    } catch (e) {
      console.warn("[request] socket notify failed:", e?.message || e);
    }

    return res.json({
      ok: true,
      requestId: String(reqDoc._id),
      conversationId: String(convo._id),
    });
  } catch (e) {
    console.error("POST /request error:", e);
    return res.status(500).json({ error: "Failed to create request." });
  }
});

/**
 * GET /api/:school/request/exists?targetId=...
 * 현재 로그인 사용자가 이미 요청했는지 여부(버튼 상태용)
 */
router.get("/exists", async (req, res) => {
  try {
    const school = req.params.school;
    const userEmail = (req.user?.email || "").toLowerCase();
    const { targetId } = req.query || {};
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid targetId." });
    }
    const found = await Request.findOne({ school, targetId, fromUser: userEmail }).select("_id conversationId");
    return res.json({
      exists: !!found,
      requestId: found?._id,
      conversationId: found?.conversationId,
    });
  } catch (e) {
    console.error("GET /request/exists error:", e);
    return res.status(500).json({ error: "Failed to check." });
=======
    } catch {}

    return res.json({ ok: true, requestId: String(reqDoc._id), conversationId: String(convo._id) });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ message: "Request already exists." });
    }
    console.error("POST /request error:", e);
    return res.status(500).json({ message: "Failed to create request." });
  }
});

/** GET /api/:school/request/exists?targetId=... */
router.get("/exists", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const { targetId } = req.query || {};
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid targetId." });
    }
    const found = await Request.findOne({ school, targetId, fromUser: req.user._id }).select("_id conversationId");
    return res.json({ exists: !!found, requestId: found?._id, conversationId: found?.conversationId });
  } catch (e) {
    console.error("GET /request/exists error:", e);
    return res.status(500).json({ message: "Failed to check." });
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
  }
});

module.exports = router;







<<<<<<< HEAD
=======




>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
