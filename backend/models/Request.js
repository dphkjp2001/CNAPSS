// backend/models/Request.js
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },

    // 요청 대상: Academic Board의 "Looking for" 글
    targetType: { type: String, enum: ["career_post"], default: "career_post", index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // 누가 → 누구에게
    fromUser: { type: String, required: true, lowercase: true, index: true }, // requester (email)
    toUser: { type: String, required: true, lowercase: true, index: true },   // post author (email)

    // 첫 메시지 본문
    initialMessage: { type: String, default: "" },

    // 상태(이번 버전은 자동 수락이므로 기본 accepted)
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "accepted", index: true },

    // 자동 생성된 대화 ID
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", index: true },
  },
  { timestamps: true }
);

// 같은 글에 같은 유저가 중복 요청 금지
RequestSchema.index({ targetId: 1, fromUser: 1 }, { unique: true });

RequestSchema.statics.ensureIndexesUpToDate = async function () {
  try {
    await this.syncIndexes();
  } catch (e) {
    // 노이즈 최소화
    console.error("[Request.syncIndexes] failed:", e?.message || e);
  }
};

module.exports = mongoose.model("Request", RequestSchema);








