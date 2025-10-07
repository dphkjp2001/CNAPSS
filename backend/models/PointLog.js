// backend/models/PointLog.js
const mongoose = require("mongoose");

const PointLogSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason:  { type: String, required: true, index: true }, // 'free_post'|'free_comment'|'ac_post'|'ac_comment'|'looking_post'
  delta:   { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model("PointLog", PointLogSchema);
