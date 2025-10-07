// backend/models/Conversation.js
const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastReadAt: { type: Date, default: null }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  school:       { type: String, required: true, index: true },
  participants: { type: [ParticipantSchema], validate: v => v.length === 2 },
  lastMessageAt:{ type: Date, default: Date.now }
}, { timestamps: true });

ConversationSchema.index({ "participants.userId": 1, school: 1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
