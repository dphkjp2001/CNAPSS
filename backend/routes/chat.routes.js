// backend/routes/chat.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const { startConversationLimiter, sendMessageLimiter } = require("../middleware/rateLimits");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { emitToUsers, emitToConversation } = require("../sockets/realtime");
const { aliasMapForConversation } = require("../utils/anon");

const router = express.Router();
const pickSchool = (req) => (req.params?.school) || (req.user?.school) || req.query.school;
const otherParticipant = (convo, me) => (convo.participants.find(p => String(p.userId) !== String(me))?.userId);

// 목록
router.get(["/conversations", "/:school/conversations"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const convos = await Conversation.find({
    school, "participants.userId": req.user._id
  }).sort({ lastMessageAt: -1 }).lean();

  const out = await Promise.all(convos.map(async c => {
    const last = await Message.findOne({ conversationId: c._id }).sort({ createdAt: -1 }).lean();
    const unread = await Message.countDocuments({ conversationId: c._id, recipientId: req.user._id, readAt: null });
    const ids = c.participants.map(p => p.userId);
    const map = aliasMapForConversation({ userIdA: ids[0], userIdB: ids[1] });
    const myAlias = map[String(req.user._id)];
    const peerAlias = map[String(otherParticipant(c, req.user._id))];
    return {
      _id: c._id,
      school: c.school,
      lastMessageAt: c.lastMessageAt,
      unread,
      lastMessage: last ? { body: last.body, createdAt: last.createdAt } : null,
      myAlias, peerAlias
    };
  }));

  res.json(out);
});

// 생성/가져오기
router.post(["/conversations", "/:school/conversations"], requireAuth, ensureSchoolScope, startConversationLimiter, async (req, res) => {
  const school = pickSchool(req);
  const { toUserId } = req.body || {};
  if (!toUserId) return res.status(400).json({ message: "Missing toUserId" });
  if (String(toUserId) === String(req.user._id)) return res.status(400).json({ message: "Cannot message yourself" });

  let convo = await Conversation.findOne({
    school,
    participants: { $all: [{ $elemMatch: { userId: req.user._id } }, { $elemMatch: { userId: toUserId } }] }
  });
  if (!convo) {
    convo = await Conversation.create({
      school,
      participants: [{ userId: req.user._id }, { userId: toUserId }],
      lastMessageAt: new Date()
    });
  }
  const ids = convo.participants.map(p => p.userId);
  const map = aliasMapForConversation({ userIdA: ids[0], userIdB: ids[1] });
  res.status(201).json({
    _id: convo._id, school: convo.school, lastMessageAt: convo.lastMessageAt,
    myAlias: map[String(req.user._id)],
    peerAlias: map[String(otherParticipant(convo, req.user._id))]
  });
});

// 메시지 목록
router.get(["/conversations/:id/messages", "/:school/conversations/:id/messages"], requireAuth, ensureSchoolScope, async (req, res) => {
  const { id } = req.params;
  const { limit = 30, before } = req.query;
  const convo = await Conversation.findById(id);
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  const isMember = convo.participants.some(p => String(p.userId) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: "Not a participant" });

  const ids = convo.participants.map(p => p.userId);
  const map = aliasMapForConversation({ userIdA: ids[0], userIdB: ids[1] });

  const filter = { conversationId: convo._id };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  const out = items.reverse().map(m => ({
    _id: m._id,
    conversationId: m.conversationId,
    body: m.body,
    attachments: m.attachments || [],
    createdAt: m.createdAt,
    readAt: m.readAt,
    mine: String(m.senderId) === String(req.user._id),
    senderAlias: map[String(m.senderId)]
  }));
  res.json(out);
});

// 메시지 전송
router.post(["/conversations/:id/messages", "/:school/conversations/:id/messages"], requireAuth, ensureSchoolScope, sendMessageLimiter, async (req, res) => {
  const school = pickSchool(req);
  const { id } = req.params;
  const { body = "", attachments = [] } = req.body || {};
  const convo = await Conversation.findById(id);
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  if (convo.school !== school) return res.status(403).json({ message: "School mismatch" });
  const isMember = convo.participants.some(p => String(p.userId) === String(req.user._id));
  if (!isMember) return res.status(403).json({ message: "Not a participant" });

  const to = otherParticipant(convo, req.user._id);
  const msg = await Message.create({
    school, conversationId: convo._id, senderId: req.user._id, recipientId: to, body, attachments
  });
  convo.lastMessageAt = msg.createdAt;
  await convo.save();

  const ids = convo.participants.map(p => p.userId);
  const map = aliasMapForConversation({ userIdA: ids[0], userIdB: ids[1] });
  const payload = {
    _id: msg._id,
    conversationId: msg.conversationId,
    body: msg.body,
    attachments: msg.attachments || [],
    createdAt: msg.createdAt,
    readAt: msg.readAt,
    mine: false,
    senderAlias: map[String(msg.senderId)]
  };

  emitToConversation(convo._id, "message:new", payload);
  emitToUsers([req.user._id, to], "conversation:updated", { conversationId: convo._id, lastMessageAt: msg.createdAt, preview: msg.body });

  res.status(201).json({ ...payload, mine: true });
});

// 읽음 처리
router.post(["/conversations/:id/read", "/:school/conversations/:id/read"], requireAuth, ensureSchoolScope, async (req, res) => {
  const { id } = req.params;
  const convo = await Conversation.findById(id);
  if (!convo) return res.status(404).json({ message: "Conversation not found" });
  const me = convo.participants.find(p => String(p.userId) === String(req.user._id));
  if (!me) return res.status(403).json({ message: "Not a participant" });

  me.lastReadAt = new Date();
  await convo.save();
  await Message.updateMany({ conversationId: convo._id, recipientId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });

  emitToConversation(convo._id, "conversation:read", { conversationId: convo._id, userId: req.user._id, lastReadAt: me.lastReadAt });
  res.json({ ok: true, lastReadAt: me.lastReadAt });
});

module.exports = router;


