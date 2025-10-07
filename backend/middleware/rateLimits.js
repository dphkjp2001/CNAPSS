// backend/middleware/rateLimits.js
const rateLimit = require("express-rate-limit");

// 이메일 코드 요청(Phase1에서 사용)
const requestCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code requests. Try again later." }
});

// 새 대화 생성(스팸 방지)
const startConversationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many new conversations. Try later." }
});

// 메시지 전송(버스트 제한)
const sendMessageLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages in short time." }
});

module.exports = { requestCodeLimiter, startConversationLimiter, sendMessageLimiter };
