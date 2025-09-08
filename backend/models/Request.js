// backend/models/Request.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const requestSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, enum: ALLOWED_SCHOOLS, lowercase: true, trim: true },

    // source: 'market' | 'coursehub' | 'coursehub_wtb'
    source: {
      type: String,
      required: true,
      enum: ["market", "coursehub", "coursehub_wtb"],
      default: "market",
      index: true,
    },

    // Target (polymorphic)
    // ⚠️ default:null 제거 → 사용 안 하는 필드는 "존재 자체가 없게" 저장
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem" },   // market
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material" }, // coursehub / wtb

    // actors
    buyer: { type: String, required: true, lowercase: true, trim: true },   // email
    seller: { type: String, required: true, lowercase: true, trim: true },  // email

    // content
    message: { type: String, required: true, trim: true },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

/** Validate: target required by source */
requestSchema.pre("validate", function (next) {
  // normalize nulls → undefined, and drop irrelevant field
  if (this.itemId === null) this.itemId = undefined;
  if (this.materialId === null) this.materialId = undefined;

  if (this.source === "market") {
    if (!this.itemId) return next(new Error("itemId required for market requests"));
    // ensure the other side is not stored at all
    this.materialId = undefined;
  } else {
    // coursehub or coursehub_wtb
    if (!this.materialId) return next(new Error("materialId required for coursehub requests"));
    this.itemId = undefined;
  }
  next();
});

/**
 * ✅ Unique constraints (partial indexes)
 *  - Use $exists:true instead of {$ne:null} to avoid $not in partial index on older mongod
 *  - Also include 'source' in both the key and the partial filter to keep indexes tight
 */

// Marketplace: one request per (school, 'market', itemId, buyer)
requestSchema.index(
  { school: 1, source: 1, itemId: 1, buyer: 1 },
  {
    name: "uniq_market_req",
    unique: true,
    partialFilterExpression: { source: "market", itemId: { $exists: true } },
  }
);

// CourseHub (sale + wanted): one request per (school, 'coursehub*', materialId, buyer)
requestSchema.index(
  { school: 1, source: 1, materialId: 1, buyer: 1 },
  {
    name: "uniq_material_req",
    unique: true,
    // $in은 partial filter에서 허용됨. 보수적으로 source 조건을 포함해준다.
    partialFilterExpression: { source: { $in: ["coursehub", "coursehub_wtb"] }, materialId: { $exists: true } },
  }
);

// 🔧 Drop legacy/conflicting indexes once
requestSchema.statics.migrateIndexes = async function () {
  try {
    const existing = await this.collection.indexes();
    const toDrop = [
      "school_1_itemId_1_buyer_1", // very old
      "uniq_market_req",           // drop & recreate with new partial filter
      "uniq_material_req",
    ];
    for (const name of toDrop) {
      if (existing.find((ix) => ix.name === name)) {
        await this.collection.dropIndex(name);
        console.log(`[Request] dropped index ${name}`);
      }
    }
  } catch (e) {
    console.error("[Request] migrateIndexes error:", e.message);
  }
};

// 👉 Call on boot: migrate + sync/create
requestSchema.statics.ensureIndexesUpToDate = async function () {
  await this.migrateIndexes();
  try {
    await this.syncIndexes();
  } catch (err) {
    console.warn("[Request] syncIndexes failed, falling back to createIndexes:", err?.message || err);
    await this.createIndexes();
  }
};

module.exports = mongoose.model("Request", requestSchema);







