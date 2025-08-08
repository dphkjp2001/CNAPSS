//backend/models/Conversation
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "MarketItem" },
    seller: { type: String, required: true }, // 이메일
    buyer: { type: String, required: true },  // 이메일
    lastMessage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
