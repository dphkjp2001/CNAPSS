// backend/sockets/realtime.js
// Socket.IO 인스턴스 & 유틸을 공유하기 위한 얇은 버스
let io = null;
const userSockets = new Map(); // userId -> socketId

function setIO(instance) { io = instance; }
function getIO() { return io; }

function setUserSocket(userId, socketId) { userSockets.set(String(userId), socketId); }
function removeUserSocket(userId) { userSockets.delete(String(userId)); }
function getUserSocket(userId) { return userSockets.get(String(userId)); }

function emitToUser(userId, event, payload) {
  const sid = getUserSocket(userId);
  if (io && sid) io.to(sid).emit(event, payload);
}
function emitToUsers(userIds = [], event, payload) {
  if (!io) return;
  userIds.forEach(uid => {
    const sid = getUserSocket(uid);
    if (sid) io.to(sid).emit(event, payload);
  });
}
function emitToConversation(conversationId, event, payload) {
  if (io) io.to(`conv:${conversationId}`).emit(event, payload);
}

module.exports = {
  setIO, getIO,
  setUserSocket, removeUserSocket, getUserSocket,
  emitToUser, emitToUsers, emitToConversation
};
