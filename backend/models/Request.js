// backend/models/Request.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  school: { type: String, required: true, enum: ["nyu", "columbia", "boston"] },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "MarketItem" },
  buyer: { type: String, required: true, lowercase: true, trim: true }, // email
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// prevent duplicate requests per school / item / buyer
requestSchema.index({ school: 1, itemId: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model("Request", requestSchema);
