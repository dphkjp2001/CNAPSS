// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];
// ✅ WTB 소스 정식 추가
const ALLOWED_SOURCES = ["market", "coursehub", "coursehub_wtb", "dm"];

const conversationSchema = new mongoose.Schema(
  {
    // legacy (market only)
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // common resource (market/material 공통)
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resourceTitle: { type: String, default: "" },

    // participants (email, lowercased)
    buyer: { type: String, required: true, index: true, lowercase: true, trim: true },
    seller: { type: String, required: true, index: true, lowercase: true, trim: true },

    // convenience array
    participants: { type: [String], default: [] },

    // last message preview
    lastMessage: { type: String, default: "" },

    // ✅ 대화 소스 (market / coursehub / coursehub_wtb / dm)
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

// unique per item/resource (if resourceId exists)
conversationSchema.index(
  { school: 1, source: 1, resourceId: 1, buyer: 1, seller: 1 },
  { unique: true, partialFilterExpression: { resourceId: { $ne: null } } }
);

module.exports = mongoose.model("Conversation", conversationSchema);



