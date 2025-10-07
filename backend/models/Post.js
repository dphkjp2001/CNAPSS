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
    // NEW: Post mode (for Academic board only)
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

    // optional/common counters
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: false, // keep unknown fields to avoid breaking existing code
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Normalize outbound shape for FE compatibility
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

        // academic board일 때만 looking_for 허용, 나머지는 강제로 general
        ret.mode = ret.board === "academic" ? normalized : "general";

        // Backward-compat aliases the FE might be using
        if (typeof ret.lookingFor === "undefined") {
          ret.lookingFor = ret.mode === "looking_for";
        }
        if (!ret.kind) ret.kind = ret.mode;
        if (!ret.type) ret.type = ret.mode;

        return ret;
      },
    },
  }
);

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




