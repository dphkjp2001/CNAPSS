// backend/services/points.service.js
const PointLog = require("../models/PointLog");
const User = require("../models/User");

const RULES = {
  DAILY_CAP: 30,
  FREE_POST: 2,
  FREE_COMMENT: 3,
  AC_POST: 3,
  AC_COMMENT: 4,
  LOOKING_COST: -5
};

function startOfUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  return d;
}

async function todayEarned(userId) {
  const from = startOfUTC();
  const sum = await PointLog.aggregate([
    { $match: { userId, createdAt: { $gte: from }, delta: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$delta" } } }
  ]);
  return sum?.[0]?.total || 0;
}

// 양수는 일일 상한 적용, 음수는 그대로 차감
async function addPoints({ userId, reason, delta }) {
  let apply = delta;
  if (delta > 0) {
    const earned = await todayEarned(userId);
    const remain = Math.max(0, RULES.DAILY_CAP - earned);
    apply = Math.min(delta, remain);
    if (apply <= 0) {
      // 상한 초과 → 로그만 남기지 않고 무시
      return { applied: 0, capped: true };
    }
  }
  await PointLog.create({ userId, reason, delta: apply });
  await User.updateOne({ _id: userId }, { $inc: { points: apply } });
  return { applied: apply, capped: false };
}

module.exports = { RULES, addPoints };
