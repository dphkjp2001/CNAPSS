// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * Minimal sources for now:
 *  - "looking_for" : Academic ‘Looking for’에서 생성된 DM
 *  - "dm"          : 사용자가 Messages 화면에서 직접 시작한 DM
 *
 * (나중에 세분화하려면 "looking_for/course_materials" 등만 여기 배열에 추가하면 됨)
 */
const ALLOWED_SOURCES = ["looking_for", "dm"];

const conversationSchema = new mongoose.Schema(
  {
    // (optional) legacy
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // (optional) generic resource linkage
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resourceTitle: { type: String, default: "" },

    // participants (emails, lowercase)
    buyer: { type: String, required: true, index: true, lowercase: true, trim: true },
    seller: { type: String, required: true, index: true, lowercase: true, trim: true },

    // convenience array
    participants: { type: [String], default: [] },

    // last message preview
    lastMessage: { type: String, default: "" },

    // ✅ minimal source set
    source: { type: String, enum: ALLOWED_SOURCES, required: true, index: true },

    // 🔐 tenant scope
    school: {
      type: String,
      enum: ALLOWED_SCHOOLS,
      lowercase: true,
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

// keep participants in sync
conversationSchema.pre("save", function (next) {
  const set = new Set([this.buyer, this.seller].filter(Boolean));
  this.participants = Array.from(set);
  next();
});

// helpful indices
conversationSchema.index({ school: 1, updatedAt: -1 });
conversationSchema.index({ school: 1, buyer: 1, updatedAt: -1 });
conversationSchema.index({ school: 1, seller: 1, updatedAt: -1 });

// unique per resource when present
conversationSchema.index(
  { school: 1, source: 1, resourceId: 1, buyer: 1, seller: 1 },
  { unique: true, partialFilterExpression: { resourceId: { $ne: null } } }
);

module.exports = mongoose.model("Conversation", conversationSchema);




