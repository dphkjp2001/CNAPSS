// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * NOTE
 * - Keep sources minimal for now.
 * - We currently allow only:
 *    - "looking_for" : requests created from Academic 'Looking for' posts
 *    - "dm"          : direct messages started from Messages UI
 * - In the future we can refine "looking_for" into:
 *    - "looking_for/course_materials" | "looking_for/study_mate" | "looking_for/coffee_chat"
 *   (When we do, just extend ALLOWED_SOURCES accordingly.)
 */
const ALLOWED_SOURCES = ["looking_for", "dm"];

const conversationSchema = new mongoose.Schema(
  {
    // optional legacy fields
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // optional generic resource linkage
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resourceTitle: { type: String, default: "" },

    // participants (emails, normalized to lowercase)
    buyer: { type: String, required: true, index: true, lowercase: true, trim: true },
    seller: { type: String, required: true, index: true, lowercase: true, trim: true },

    // convenience array (kept in sync via pre-save)
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




