// backend/models/Request.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "MarketItem" },
  buyer: { type: String, required: true }, // 이메일
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Request", requestSchema);
