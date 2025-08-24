// // backend/models/MarketItem.js
// const mongoose = require("mongoose");

// const marketItemSchema = new mongoose.Schema({
//     seller: { type: String, required: true },
//   title: { type: String, required: true },
//   description: { type: String },
//   price: { type: Number, required: true },
//   images: [{ type: String }],
//   status: {
//     type: String,
//     enum: ["available", "reserved", "sold"],
//     default: "available",
//   },
//   school: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("MarketItem", marketItemSchema);


// backend/models/MarketItem.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const marketItemSchema = new mongoose.Schema(
  {
    seller: { type: String, required: true, index: true }, // email
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["available", "reserved", "sold"],
      default: "available",
      index: true,
    },
    // 🔐 테넌시 스코프
    school: {
      type: String,
      required: true,
      lowercase: true,
      enum: ALLOWED_SCHOOLS,
      index: true,
    },
  },
  { timestamps: true }
);

// 🔧 인덱스 (목록/검색 성능)
marketItemSchema.index({ school: 1, createdAt: -1 });
marketItemSchema.index({ school: 1, status: 1, createdAt: -1 });
marketItemSchema.index({ school: 1, price: 1 });
marketItemSchema.index({ seller: 1, school: 1 });

module.exports = mongoose.model("MarketItem", marketItemSchema);
