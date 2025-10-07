// backend/models/Request.js
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },

    // 대상(예: post, market item 등) – null일 수 있음
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // 보낸 사람
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // 비로그인/시스템 생성 고려해서 optional
      default: null,
      index: true,
    },

    // 받는 사람(필요 시)
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // 상태/타입 등 부가 정보
    type: { type: String, default: "generic", index: true },
    status: { type: String, default: "pending", index: true },

    message: { type: String, default: "" },

    // 만료 시각(있을 때만 TTL 적용)
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// ---------------------------
// Indexes
// ---------------------------

// ✅ (targetId, fromUser) 조합을 유니크하게 유지하되,
// 두 값 모두 존재할 때만 검사하도록 partial index 적용.
// 이러면 {targetId:null, fromUser:null} 문서 여러 개 저장돼도 충돌 안 남.
RequestSchema.index(
  { targetId: 1, fromUser: 1 },
  {
    unique: true,
    name: "uniq_target_from_notnull",
    partialFilterExpression: {
      targetId: { $type: "objectId" },
      fromUser: { $type: "objectId" },
    },
  }
);

// ✅ expiresAt 있을 때만 TTL 동작 (partial TTL)
// (MongoDB는 TTL + partialFilterExpression을 함께 지원)
RequestSchema.index(
  { expiresAt: 1 },
  {
    name: "ttl_expiresAt_if_set",
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $type: "date" } },
  }
);

module.exports = mongoose.model("Request", RequestSchema);









