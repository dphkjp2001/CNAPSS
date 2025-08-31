// // backend/models/Conversation.js
// const mongoose = require("mongoose");

// const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

// const conversationSchema = new mongoose.Schema(
//   {
//     itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

//     // participants (email)
//     buyer: { type: String, required: true, index: true },
//     seller: { type: String, required: true, index: true },

//     // convenience array
//     participants: { type: [String], default: [] },

//     lastMessage: { type: String, default: "" },

//     // 🔐 tenant scope
//     school: {
//       type: String,
//       enum: ALLOWED_SCHOOLS,
//       lowercase: true,
//       index: true,
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// // keep participants in sync
// conversationSchema.pre("save", function (next) {
//   const set = new Set([this.buyer, this.seller].filter(Boolean));
//   this.participants = Array.from(set);
//   next();
// });

// // helpful indices
// conversationSchema.index({ school: 1, updatedAt: -1 });
// conversationSchema.index({ school: 1, buyer: 1, updatedAt: -1 });
// conversationSchema.index({ school: 1, seller: 1, updatedAt: -1 });

// module.exports = mongoose.model("Conversation", conversationSchema);


// backend/models/Conversation.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const conversationSchema = new mongoose.Schema(
  {
    // legacy (market only)
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },

    // participants (email)
    buyer: { type: String, required: true, index: true, lowercase: true, trim: true },
    seller: { type: String, required: true, index: true, lowercase: true, trim: true },

    // convenience array
    participants: { type: [String], default: [] },

    lastMessage: { type: String, default: "" },

    // 🔐 tenant scope
    school: { type: String, enum: ALLOWED_SCHOOLS, lowercase: true, index: true, required: true },

    // ★ NEW: generic context (for CourseHub, DM, etc.)
    source: { type: String, enum: ["market", "coursehub", "dm"], default: "dm", index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null }, // MarketItem _id or Material _id
    resourceTitle: { type: String, default: "" }, // snapshot title for list
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


