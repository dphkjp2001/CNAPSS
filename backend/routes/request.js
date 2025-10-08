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
 */
router.post("/", async (req, res) => {
  try {
    const school = req.params.school;
    const { targetId, initialMessage } = req.body || {};
    if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ error: "Invalid targetId." });

    const post = await AcademicPost.findOne({ _id: targetId, school }).populate("author", "email _id").lean();
    if (!post) return res.status(404).json({ error: "Post not found." });

    const authorId = post.author?._id;
    const authorEmail = String(post.author?.email || "").toLowerCase();
    const userId = req.user._id;
    const userEmail = String(req.user.email || "").toLowerCase();

    // only seeking posts accept requests
    const postMode = String(post.mode || post.postType || post.type || "").toLowerCase();
    if (!(postMode === "looking_for" || postMode === "seeking")) {
      return res.status(400).json({ error: "Only 'seeking' posts accept requests." });
    }
    if (!authorId || authorEmail === userEmail) {
      return res.status(400).json({ error: "Invalid target user." });
    }

    // prevent duplicates (same user → same post)
    const exists = await Request.findOne({ school, targetId, fromUser: userId });
    if (exists) {
      return res.status(409).json({ error: "Already requested.", requestId: exists._id, conversationId: exists.conversationId });
    }

    // conversation (email 기반으로 맞춰서)
    let convo = await Conversation.findOne({
      school,
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
        source: "academic_looking_for",
        itemId: targetId,
        resourceTitle: post.title || "Looking for",
        lastMessage: "",
      });
    }

    const text = (initialMessage || "").trim() || "Hi! I'm interested in your post.";
    const msg = await Message.create({ conversationId: convo._id, sender: userEmail, content: text, school });
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

    // socket notify (best-effort)
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
    console.error("POST /request error:", e);
    return res.status(500).json({ error: "Failed to create request." });
  }
});

/** GET /api/:school/request/exists?targetId=... */
router.get("/exists", async (req, res) => {
  try {
    const school = req.params.school;
    const { targetId } = req.query || {};
    if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ error: "Invalid targetId." });
    const found = await Request.findOne({ school, targetId, fromUser: req.user._id }).select("_id conversationId");
    return res.json({ exists: !!found, requestId: found?._id, conversationId: found?.conversationId });
  } catch (e) {
    console.error("GET /request/exists error:", e);
    return res.status(500).json({ error: "Failed to check." });
  }
});

module.exports = router;








