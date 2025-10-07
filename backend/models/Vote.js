// backend/models/Vote.js
const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
  school: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["post","comment"], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  value: { type: Number, enum: [1, -1], required: true } // 1=up, -1=down
}, { timestamps: true });

VoteSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", VoteSchema);
