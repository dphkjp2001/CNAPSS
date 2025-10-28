// backend/models/Post.js
const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

// NOTE:
// - strict:false 로 두어 기존 스키마에 없던 필드가 있어도 그대로 저장/반환되게 합니다.
// - 'mode' 는 academic board 에서만 의미가 있으며 'general' | 'looking_for' 를 가집니다.
const PostSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },
    board: {
      type: String,
      enum: ["free", "academic"],
      required: true,
      index: true,
    },
    // Academic board only
    mode: {
      type: String,
      enum: ["general", "looking_for"],
      default: "general",
      index: true,
    },

    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    anonymous: { type: Boolean, default: false },

    images: { type: [ImageSchema], default: [] },

    // (legacy thumbs) kept for compatibility
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ New: Up/Down vote (Freeboard 전용으로 사용)
    upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    commentCount: { type: Number, default: 0 },

    // Voting
    counts: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 }
    },
    hotScore: { type: Number, default: 0, index: true },

    // ✅ (optional) 공개링크용 키들 — 실제 도큐먼트에 있을 수도/없을 수도 있음
    shortId: { type: String },
    slug: { type: String },
    publicId: { type: String },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Normalize mode for FE compatibility
        const inbound =
          ret.mode ||
          ret.kind ||
          ret.type ||
          (ret.lookingFor ? "looking_for" : null);

        const normalized =
          inbound === "looking_for" ||
          inbound === "looking" ||
          inbound === "lf"
            ? "looking_for"
            : "general";

        ret.mode = ret.board === "academic" ? normalized : "general";

        if (typeof ret.lookingFor === "undefined") {
          ret.lookingFor = ret.mode === "looking_for";
        }
        if (!ret.kind) ret.kind = ret.mode;
        if (!ret.type) ret.type = ret.mode;

        // ✅ add counts for convenience
        ret.upCount = Array.isArray(ret.upvoters) ? ret.upvoters.length : 0;
        ret.downCount = Array.isArray(ret.downvoters) ? ret.downvoters.length : 0;
        ret.score = ret.upCount - ret.downCount;

        return ret;
      },
    },
  }
);

// 성능 및 유니크 보장(있을 때만) — 기존 데이터에 해당 필드가 없으면 무시됨(sparse)
PostSchema.index({ school: 1, shortId: 1 }, { unique: true, sparse: true });
PostSchema.index({ school: 1, slug: 1 }, { unique: true, sparse: true });
PostSchema.index({ school: 1, publicId: 1 }, { unique: true, sparse: true });

// Ensure we always store a normalized mode on save
PostSchema.pre("validate", function (next) {
  const inbound =
    this.mode || this.kind || this.type || (this.lookingFor ? "looking_for" : null);

  const normalized =
    inbound === "looking_for" || inbound === "looking" || inbound === "lf"
      ? "looking_for"
      : "general";

  this.mode = this.board === "academic" ? normalized : "general";
  next();
});

module.exports = mongoose.model("Post", PostSchema);






