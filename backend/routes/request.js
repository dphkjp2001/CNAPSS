// backend/routes/request.js
const express = require("express");
const mongoose = require("mongoose");

const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Post = require("../models/Post"); // ✅ use Post instead of CareerPost

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

const router = express.Router({ mergeParams: true });

// Hard guard (defense in depth)
router.use(requireAuth, schoolGuard);

/**
 * POST /api/:school/request
 * Academic "Looking for" post only
 * body: { targetId, initialMessage }
 * result: { ok, requestId, conversationId }
 */
router.post("/", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const userEmail = String(req.user?.email || "").toLowerCase();
    const { targetId, initialMessage } = req.body || {};

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ error: "Invalid targetId." });
    }

    const post = await Post.findOne({ _id: targetId, school }).lean();
    if (!post) return res.status(404).json({ error: "Post not found." });

    // ✅ Only academic 'looking_for'
    const board = String(post.board || "").toLowerCase();
    const mode =
      String(post.mode || post.kind || post.type || (post.lookingFor ? "looking_for" : "general"))
        .toLowerCase();

    if (!(board === "academic" && mode === "looking_for")) {
      return res.status(400).json({ error: "Requests are only allowed on academic 'looking_for' posts." });
    }

    const authorEmail = String(post.email || post.authorEmail || "").toLowerCase();
    if (!authorEmail) return res.status(400).json({ error: "Post has no author email." });
    if (authorEmail === userEmail) {
      return res.status(400).json({ error: "You cannot send a request to your own post." });
    }

    // Duplicate guard
    const exists = await Request.findOne({ school, targetId, fromUser: userEmail });
    if (exists) {
      return res.status(409).json({
        error: "You have already requested.",
        requestId: exists._id,
        conversationId: exists.conversationId,
      });
    }

    // Start or reuse conversation (buyer/seller semantics kept)
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

    const text = String(initialMessage || "").trim() || "Hi! I'm interested in your post.";
    const msg = await Message.create({
      conversationId: convo._id,
      sender: userEmail,
      content: text,
      school,
    });

    convo.lastMessage = text;
    convo.updatedAt = new Date();
    await convo.save();

    const reqDoc = await Request.create({
      school,
      targetType: "academic_post", // ✅
      targetId,
      fromUser: userEmail,
      toUser: authorEmail,
      initialMessage: text,
      status: "accepted",
      conversationId: convo._id,
    });

    // Socket preview to the author (best-effort)
    try {
      const io = req.app.get("io");
      if (io) {
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
 */
router.get("/exists", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const userEmail = String(req.user?.email || "").toLowerCase();
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








