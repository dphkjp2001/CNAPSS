// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * We only use:
 *  - "looking_for" : Academic 'Looking for' → DM
 *  - "dm"          : User-started direct messages
 *
 * Legacy sources ("coursehub_wtb", "coursehub", "market") might still be sent
 * by older routes. We normalize them to "looking_for" in pre-validate hook
 * so the server won't crash even if an old value is used.
 */
const ALLOWED_SOURCES = ["looking_for", "dm"];

const conversationSchema = new mongoose.Schema(
  {
    // optional legacy linkage
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // optional generic resource linkage
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resourceTitle: { type: String, default: "" },

    // participants (emails, lowercase)
    buyer: { type: String, required: true, index: true, lowercase: true, trim: true },
    seller: { type: String, required: true, index: true, lowercase: true, trim: true },

    // convenience array
    participants: { type: [String], default: [] },

    // last message preview
    lastMessage: { type: String, default: "" },

    // minimal source set
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

// 🔧 normalize legacy sources before validation
conversationSchema.pre("validate", function (next) {
  const legacy = String(this.source || "").toLowerCase();
  if (["coursehub_wtb", "coursehub", "market"].includes(legacy)) {
    this.source = "looking_for";
  }
  next();
});

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




