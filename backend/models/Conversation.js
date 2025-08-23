// backend/models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "MarketItem",
      index: true,
    },
    seller: { type: String, required: true, lowercase: true, index: true }, // email
    buyer: { type: String, required: true, lowercase: true, index: true },  // email
    lastMessage: { type: String, default: "" },

    // ✅ school scope (always lowercase)
    school: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["nyu", "columbia", "boston"],
      index: true,
    },
  },
  { timestamps: true }
);

// same buyer/seller cannot make duplicate room for the same item within a school
conversationSchema.index(
  { school: 1, itemId: 1, buyer: 1, seller: 1 },
  { unique: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
