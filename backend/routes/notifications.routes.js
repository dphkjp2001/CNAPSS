// backend/routes/notifications.routes.js
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const ensureSchoolScope = require("../middleware/ensureSchoolScope");
const Notification = require("../models/Notification");

const router = express.Router();
const pickSchool = (req) => (req.params?.school) || (req.user?.school) || req.query.school;

// 배지용 카운트
router.get(["/notifications/badge", "/:school/notifications/badge"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const count = await Notification.countDocuments({ school, userId: req.user._id, isRead: false });
  res.json({ unread: count });
});

// 목록
// GET /notifications?unreadOnly=true&limit=20&cursor=<createdAt ISO>
// 최신순, cursor 기반 페이지네이션(옵션)
router.get(["/notifications", "/:school/notifications"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const { unreadOnly, limit = 20, cursor } = req.query;
  const filter = { school, userId: req.user._id };
  if (String(unreadOnly) === "true") filter.isRead = false;
  if (cursor) filter.createdAt = { $lt: new Date(cursor) };

  const list = await Notification.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  const nextCursor = list.length ? list[list.length - 1].createdAt : null;

  res.json({ items: list.map(n => ({
    _id: n._id,
    type: n.type,
    data: n.data || {},
    isRead: !!n.isRead,
    createdAt: n.createdAt
  })), nextCursor });
});

// 읽음 처리 (단건)
router.patch(["/notifications/:id/read", "/:school/notifications/:id/read"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  const n = await Notification.findById(req.params.id);
  if (!n) return res.status(404).json({ message: "Notification not found" });
  if (n.school !== school || String(n.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!n.isRead) {
    n.isRead = true;
    n.readAt = new Date();
    await n.save();
  }
  const left = await Notification.countDocuments({ school, userId: req.user._id, isRead: false });
  res.json({ ok: true, unread: left });
});

// 모두 읽음
router.post(["/notifications/mark-all-read", "/:school/notifications/mark-all-read"], requireAuth, ensureSchoolScope, async (req, res) => {
  const school = pickSchool(req);
  await Notification.updateMany({ school, userId: req.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
  res.json({ ok: true, unread: 0 });
});

module.exports = router;
