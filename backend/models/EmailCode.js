// backend/models/EmailCode.js
// TTL 인덱스 중복 경고를 없앤, 깔끔한 버전
const mongoose = require("mongoose");

const EmailCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    // TTL index ONLY here (no extra "index: true" on field)
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// TTL: auto-remove after "expiresAt"
EmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EmailCode", EmailCodeSchema);
