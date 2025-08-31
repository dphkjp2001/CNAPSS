// backend/models/Request.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const requestSchema = new mongoose.Schema(
  {
    // tenant
    school: { type: String, required: true, enum: ALLOWED_SCHOOLS, lowercase: true, trim: true },

    // source: market | coursehub
    source: { type: String, required: true, enum: ["market", "coursehub"], default: "market", index: true },

    // target (polymorphic)
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },  // for market
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", default: null }, // for coursehub

    // actors
    buyer: { type: String, required: true, lowercase: true, trim: true },  // email
    seller: { type: String, required: true, lowercase: true, trim: true }, // email

    // content
    message: { type: String, required: true, trim: true },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Validate presence of correct target per source
requestSchema.pre("validate", function (next) {
  if (this.source === "market" && !this.itemId) {
    return next(new Error("itemId required for market requests"));
  }
  if (this.source === "coursehub" && !this.materialId) {
    return next(new Error("materialId required for coursehub requests"));
  }
  next();
});

// prevent duplicate requests per target/buyer within a school
requestSchema.index(
  { school: 1, source: 1, itemId: 1, buyer: 1 },
  { unique: true, partialFilterExpression: { itemId: { $ne: null } } }
);
requestSchema.index(
  { school: 1, source: 1, materialId: 1, buyer: 1 },
  { unique: true, partialFilterExpression: { materialId: { $ne: null } } }
);

module.exports = mongoose.model("Request", requestSchema);

