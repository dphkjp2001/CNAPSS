// backend/models/MarketItem.js
const mongoose = require("mongoose");

const marketItemSchema = new mongoose.Schema({
    seller: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ["available", "reserved", "sold"],
    default: "available",
  },
  school: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MarketItem", marketItemSchema);
