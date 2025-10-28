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
// - strict:false 로 두어 기존 스키마에 없던 필드가 있어도 그대로 저장/반환됩니다.
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

    // ✅ Up/Down vote
    upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    commentCount: { type: Number, default: 0 },

    // 계산 캐시(선택)
    counts: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
    },
    hotScore: { type: Number, default: 0, index: true },

    // ✅ 공개 링크용 키들(있을 수도/없을 수도 있음)
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

        ret.upCount = Array.isArray(ret.upvoters) ? ret.upvoters.length : 0;
        ret.downCount = Array.isArray(ret.downvoters) ? ret.downvoters.length : 0;
        ret.score = ret.upCount - ret.downCount;

        return ret;
      },
    },
  }
);

// ✅ 유니크/희소 인덱스(해당 필드가 존재할 때만)
PostSchema.index({ school: 1, shortId: 1 }, { unique: true, sparse: true });
PostSchema.index({ school: 1, slug: 1 }, { unique: true, sparse: true });
PostSchema.index({ school: 1, publicId: 1 }, { unique: true, sparse: true });

// Normalize mode
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







