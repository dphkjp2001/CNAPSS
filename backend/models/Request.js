// backend/models/Request.js
const mongoose = require("mongoose");

const ALLOWED_SCHOOLS = ["nyu", "columbia", "boston"];

const requestSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, enum: ALLOWED_SCHOOLS, lowercase: true, trim: true },

    // source 구분: market | coursehub | coursehub_wtb
    source: {
      type: String,
      required: true,
      enum: ["market", "coursehub", "coursehub_wtb"],
      default: "market",
      index: true,
    },

    // 대상 (다형)
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", default: null },   // market
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", default: null }, // coursehub / wtb

    // 행위자
    buyer: { type: String, required: true, lowercase: true, trim: true },   // email
    seller: { type: String, required: true, lowercase: true, trim: true },  // email

    // 내용
    message: { type: String, required: true, trim: true },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// 타겟 필수성 검증
requestSchema.pre("validate", function (next) {
  if (this.source === "market" && !this.itemId) {
    return next(new Error("itemId required for market requests"));
  }
  if ((this.source === "coursehub" || this.source === "coursehub_wtb") && !this.materialId) {
    return next(new Error("materialId required for coursehub requests"));
  }
  next();
});

// ✅ 최신 유니크 인덱스(부분 인덱스) 정의
requestSchema.index(
  { school: 1, source: 1, itemId: 1, buyer: 1 },
  {
    name: "uniq_market_req",
    unique: true,
    partialFilterExpression: { itemId: { $ne: null } },
  }
);
requestSchema.index(
  { school: 1, source: 1, materialId: 1, buyer: 1 },
  {
    name: "uniq_material_req",
    unique: true,
    partialFilterExpression: { materialId: { $ne: null } },
  }
);

// 🔧 구 인덱스 자동 정리 (런타임 1회)
// 오래된 인덱스: school_1_itemId_1_buyer_1  (itemId=null도 유니크 취급하던 인덱스)
requestSchema.statics.migrateIndexes = async function () {
  try {
    const existing = await this.collection.indexes();
    const legacy = existing.find((ix) => ix.name === "school_1_itemId_1_buyer_1");
    if (legacy) {
      await this.collection.dropIndex("school_1_itemId_1_buyer_1");
      console.log("[Request] dropped legacy index school_1_itemId_1_buyer_1");
    }
  } catch (e) {
    console.error("[Request] migrateIndexes error:", e.message);
  }
};

// 👉 부팅시 호출용 유틸: 마이그레이션 + 인덱스 보장
requestSchema.statics.ensureIndexesUpToDate = async function () {
  await this.migrateIndexes();
  // createIndexes/syncIndexes 중 택1; syncIndexes는 정의와 불일치도 맞춰줌
  try {
    await this.syncIndexes();
  } catch {
    await this.createIndexes();
  }
};

module.exports = mongoose.model("Request", requestSchema);




