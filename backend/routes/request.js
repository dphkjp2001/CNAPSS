// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");

const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const CareerPost = require("../models/CareerPost");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const router = express.Router({ mergeParams: true });

// 모든 라우트는 app.js에서 requireAuth + schoolGuard가 이미 걸려있지만,
// 직접 접근 시를 대비해 한 번 더 보강
router.use(requireAuth, schoolGuard);

/**
 * POST /api/:school/request
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
    let convo = await Conversation.findOne({
      school,
      $or: [
        { buyer: userEmail, seller: authorEmail },
        { buyer: authorEmail, seller: userEmail },
      ],
      // 특정 글 기준으로 묶을 수 있으면 좋지만, itemId 필드가 없을 수도 있어 optional
      $orIgnore: true,
    });

    if (!convo) {
      // 새 대화 생성
      convo = await Conversation.create({
        school,
        buyer: userEmail,
        seller: authorEmail,
        // 기존 스키마에 없을 수도 있는 필드이므로 optional
        source: "academic_looking_for",
        itemId: targetId,
        resourceTitle: post.title || "Looking for",
        lastMessage: "",
      });
    }

    // 첫 메시지 생성
    const text = (initialMessage || "").trim() || "Hi! I'm interested in your post.";
    const msg = await Message.create({
      conversationId: convo._id,
      sender: userEmail,
      content: text,
      school,
    });

    // 대화 갱신
    convo.lastMessage = text;
    convo.updatedAt = new Date();
    await convo.save();

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
        io.to(`user:${authorEmail}`).emit("chat:preview", {
          conversationId: String(convo._id),
          lastMessage: text,
          updatedAt: convo.updatedAt,
        });
      }
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
  }
});

module.exports = router;







