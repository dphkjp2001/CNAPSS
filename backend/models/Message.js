// backend/models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  school:        { type: String, required: true, index: true },
  conversationId:{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  senderId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipientId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  body:          { type: String, default: "" },
  attachments:   [{ url: String, name: String }],
  readAt:        { type: Date, default: null }
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
