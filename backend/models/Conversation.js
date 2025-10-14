// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

/**
 * Sources:
 *  - "looking_for" : Academic 'Seeking' → DM
 *  - "dm"          : User-started direct messages
 */
const ALLOWED_SOURCES = ["looking_for", "dm"];

/** Seeking 세부 분류(3가지) */
const SEEKING_KINDS = ["course_materials", "study_mate", "coffee_chat", ""];

const conversationSchema = new mongoose.Schema(
  {
    // legacy linkage (market)
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // generic resource linkage (academic post 등)
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    resourceTitle: { type: String, default: "" },

    /** seeking일 때만 의미: 3가지 분류 */
    seekingKind: { type: String, enum: SEEKING_KINDS, default: "" , index: true },

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
  // normalize seekingKind
  if (this.seekingKind) {
    this.seekingKind = String(this.seekingKind).toLowerCase().replace(/[\s-]+/g, "_");
    if (!SEEKING_KINDS.includes(this.seekingKind)) this.seekingKind = "";
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

/** 같은 글(=resourceId), 같은 상대와는 1개의 대화만 존재 */
conversationSchema.index(
  { school: 1, source: 1, resourceId: 1, buyer: 1, seller: 1 },
  { unique: true, partialFilterExpression: { resourceId: { $ne: null } } }
);

module.exports = mongoose.model("Conversation", conversationSchema);





