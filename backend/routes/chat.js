// backend/routes/chat.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router({ mergeParams: true });

const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

router.use(requireAuth, schoolGuard);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function authorizeConversation(conversationId, userEmail, userSchool) {
  if (!isValidId(conversationId)) return { ok: false, code: 400, msg: "Invalid conversation id" };
  const convo = await Conversation.findById(conversationId);
  if (!convo) return { ok: false, code: 404, msg: "Conversation not found" };
  const isParticipant = [convo.buyer, convo.seller].includes(userEmail);
  if (!isParticipant) return { ok: false, code: 403, msg: "Not a participant" };
  if (convo.school !== userSchool) return { ok: false, code: 403, msg: "Wrong tenant" };
  return { ok: true, convo };
}

/** GET 내 대화 목록 */
router.get("/conversations", async (req, res) => {
  try {
    const email = req.user.email;
    const school = req.user.school;
    const list = await Conversation.find({
      school,
      $or: [{ buyer: email }, { seller: email }],
    })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Failed to load conversations." });
  }
});

/** GET 대화 메시지 (최신→과거, UI에서 reverse해서 사용) */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    const { cursor, limit = 50 } = req.query;
    const q = { conversationId: auth.convo._id };
    if (cursor) q.createdAt = { $lt: new Date(cursor) };

    const items = await Message.find(q).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to load messages." });
  }
});

/** POST 메시지 전송 */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content required" });

    const msg = await Message.create({
      conversationId: auth.convo._id,
      sender: req.user.email,
      content,
      school: req.user.school,
    });

    auth.convo.lastMessage = content;
    auth.convo.updatedAt = new Date();
    await auth.convo.save();

    // 실시간 브로드캐스트
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`conv:${auth.convo._id}`).emit("chat:receive", {
          _id: msg._id,
          conversationId: String(auth.convo._id),
          sender: req.user.email,
          content,
          createdAt: msg.createdAt,
          readBy: msg.readBy || [],
        });
        const peer = auth.convo.buyer === req.user.email ? auth.convo.seller : auth.convo.buyer;
        io.to(`user:${peer}`).emit("chat:preview", {
          conversationId: String(auth.convo._id),
          lastMessage: content,
          updatedAt: auth.convo.updatedAt,
        });
      }
    } catch {}

    res.status(201).json(msg);
  } catch {
    res.status(500).json({ message: "Failed to send message." });
  }
});

/**
 * POST 대화 시작(없으면 생성)
 * body: { peerEmail, itemId? }
 * - ✅ 이제 source 를 명시적으로 "dm"으로 설정 (레거시 제거)
 */
router.post("/start", async (req, res) => {
  try {
    const { peerEmail, itemId = null } = req.body || {};
    const me = req.user.email;
    const school = req.user.school;

    if (!peerEmail || peerEmail === me) {
      return res.status(400).json({ message: "Invalid peerEmail" });
    }

    const peer = await User.findOne({ email: peerEmail }).select("school");
    if (!peer || peer.school !== school) {
      return res.status(403).json({ message: "Peer is not in your school." });
    }

    // 동일 상대와의 DM이 있으면 재사용
    let convo = await Conversation.findOne({
      school,
      $or: [
        { buyer: me, seller: peerEmail },
        { buyer: peerEmail, seller: me },
      ],
      // itemId는 seeking에서만 의미가 있으므로 DM에선 신경 X
    });

    if (!convo) {
      // ✅ 필수: source를 명시적으로 "dm"으로 생성한다.
      convo = await Conversation.create({
        buyer: me,
        seller: peerEmail,
        school,
        source: "dm",
        lastMessage: "",
      });
    }

    // 알림 이벤트 (선택)
    try {
      const io = req.app.get("io");
      io &&
        io.to(`user:${peerEmail}`).emit("newConversation", {
          targetEmail: peerEmail,
          conversationId: String(convo._id),
        });
    } catch {}

    res.status(201).json(convo);
  } catch {
    res.status(500).json({ message: "Failed to start conversation." });
  }
});

/** POST 읽음 처리 */
router.post("/conversations/:id/read", async (req, res) => {
  try {
    const auth = await authorizeConversation(req.params.id, req.user.email, req.user.school);
    if (!auth.ok) return res.status(auth.code).json({ message: auth.msg });

    await Message.updateMany(
      { conversationId: auth.convo._id, readBy: { $ne: req.user.email }, sender: { $ne: req.user.email } },
      { $addToSet: { readBy: req.user.email } }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Failed to mark as read." });
  }
});

module.exports = router;







