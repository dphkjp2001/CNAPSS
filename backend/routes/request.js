// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");

const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const AcademicPost = require("../models/AcademicPost");
const User = require("../models/User");

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const router = express.Router({ mergeParams: true });
router.use(requireAuth, schoolGuard);

/**
 * POST /api/:school/request
 * body: { targetId, initialMessage }
 * result: { ok, requestId, conversationId }
 *
 * ✅ 변경사항
 *  - Conversation을 찾을 때 "같은 글(resourceId) + 같은 참여자" 조건으로만 재사용
 *  - Conversation 생성 시 seekingKind, resourceId, resourceTitle 정확히 기록
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

    const postMode = String(post.mode || post.postType || post.type || "").toLowerCase();
    if (!(postMode === "looking_for" || postMode === "seeking")) {
      return res.status(400).json({ message: "Only 'looking for' posts accept requests." });
    }
    if (!authorId || authorEmail === userEmail) {
      return res.status(400).json({ message: "Invalid target user." });
    }

    // seeking kind 정규화
    const seekingKind = String(post.kind || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_"); // 'course_materials' | 'study_mate' | 'coffee_chat'

    // ✅ 같은 글 + 같은 참여자일 때만 기존 대화 재사용
    let convo = await Conversation.findOne({
      school,
      source: "looking_for",
      resourceId: targetId,
      $or: [
        { buyer: userEmail, seller: authorEmail },
        { buyer: authorEmail, seller: userEmail },
      ],
    });

    if (!convo) {
      convo = await Conversation.create({
        school,
        buyer: userEmail,
        seller: authorEmail,
        source: "looking_for",
        resourceId: targetId,                 // ← 글 ID를 명확히 저장
        resourceTitle: post.title || "Seeking",
        seekingKind,                          // ← 3가지 분류 저장
        lastMessage: "",
      });
    } else {
      // 기존 대화가 있는데 seekingKind가 비어있다면 보정
      if (!convo.seekingKind && seekingKind) {
        convo.seekingKind = seekingKind;
      }
    }

    const text = (initialMessage || "").trim() || "Hi! I'm interested in your post.";
    await Message.create({ conversationId: convo._id, sender: userEmail, content: text, school });

    convo.lastMessage = text;
    convo.updatedAt = new Date();
    await convo.save();

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
        io.to(`user:${authorEmail}`).emit("chat:preview", {
          conversationId: String(convo._id),
          lastMessage: text,
          updatedAt: convo.updatedAt,
        });
      }
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
  }
});

module.exports = router;











