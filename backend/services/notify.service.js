// backend/services/notify.service.js
const Notification = require("../models/Notification");
const { emitToUser } = require("../sockets/realtime");

function shape(n) {
  return {
    _id: n._id,
    type: n.type,
    data: n.data || {},
    isRead: !!n.isRead,
    createdAt: n.createdAt
  };
}

/**
 * 저장 + 소켓 emit('notification:new')
 */
async function pushNotification({ school, toUserId, type, data = {} }) {
  const n = await Notification.create({
    school,
    userId: toUserId,
    type,
    data
  });
  const shaped = shape(n.toObject());
  emitToUser(toUserId, "notification:new", shaped);
  return shaped;
}

module.exports = { pushNotification, shape };
