// backend/models/Material.js
const mongoose = require("mongoose");

const ALLOWED_KINDS = ["note", "syllabus", "exam", "slide", "link", "other"];
const MATERIAL_TYPES = ["personalMaterial", "personalNote"];
const SHARE_PREFERENCES = ["in_person", "online", "either"];
const STATUSES = ["active", "archived", "sold"];

const materialSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, lowercase: true, trim: true },
    courseCode: { type: String, required: true, uppercase: true, trim: true },
    courseTitle: { type: String, default: "", trim: true },

    // REQUIRED
    professor: { type: String, required: true, trim: true, maxlength: 80 },

    semester: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{4}-(spring|summer|fall|winter)$/i,
    },

    kind: { type: String, enum: ALLOWED_KINDS, default: "note", index: true },

    // Title는 짧은 한줄 제목 용도로 유지
    title: { type: String, required: true, trim: true },

    // ✅ 새로 추가: 본문 설명(선택)
    description: { type: String, default: "", trim: true },

    tags: { type: [String], default: [] },

    // 파일 업로드는 사용하지 않지만, 기존 데이터는 보존
    fileUrl: { type: String, default: "" },
    filePublicId: { type: String, default: "" },
    fileMime: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    url: { type: String, default: "" },
    hash: { type: String, default: "" },

    materialType: { type: String, enum: MATERIAL_TYPES, default: "personalMaterial", index: true },
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0, min: 0 },
    sharePreference: { type: String, enum: SHARE_PREFERENCES, default: "either", index: true },
    status: { type: String, enum: STATUSES, default: "active", index: true },

    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderEmail: { type: String, lowercase: true, trim: true },
    authorName: { type: String, trim: true },

    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

materialSchema.index({ school: 1, courseCode: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, courseCode: 1, kind: 1 });
materialSchema.index({ school: 1, courseCode: 1, materialType: 1, isFree: 1 });

module.exports = mongoose.model("Material", materialSchema);





