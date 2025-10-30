// backend/models/AcademicPost.js
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");


const ImageSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false }
);

function normalizeMode({ mode, type, postType, lookingFor }) {
  const inbound = mode || postType || type || (lookingFor ? "looking_for" : "general");
  const k = String(inbound || "").toLowerCase();
  return k === "looking_for" || k === "seeking" || k === "lf" ? "looking_for" : "general";
}

const MATERIAL_ENUM = ["lecture_notes", "syllabus", "past_exams", "quiz_prep"];



const AcademicPostSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },

    // 'general' | 'looking_for'
    mode: { type: String, enum: ["general", "looking_for"], default: "general", index: true },

    // seeking일 때만 의미: 'course_materials' | 'study_mate' | 'coffee_chat'
    kind: { type: String, default: "", index: true },

    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },

    // seeking:course_materials 전용 메타
    courseName: { type: String, default: "" },
    professor: { type: String, default: "" },
    materials: { type: [String], enum: MATERIAL_ENUM, default: [] },

    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    anonymous: { type: Boolean, default: false },

    images: { type: [ImageSchema], default: [] },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },

    // ⬇️ 투표(상호배타) — 프런트 요구사항 충족을 위해 per-user 저장
    upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // 기존 counts 필드 유지(하위호환). 라우트에서 길이로 갱신해줌.
    counts: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 }
    },

    hotScore: { type: Number, default: 0, index: true },

    shortId: { type: String, index: true },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const m = normalizeMode(ret);
        ret.mode = m;
        if (!ret.type) ret.type = m;        // alias
        if (!ret.postType) ret.postType = m; // alias
        if (typeof ret.lookingFor === "undefined") ret.lookingFor = m === "looking_for";
        // counts 동기화
        ret.upCount = Array.isArray(ret.upvoters) ? ret.upvoters.length : (ret.counts?.up || 0);
        ret.downCount = Array.isArray(ret.downvoters) ? ret.downvoters.length : (ret.counts?.down || 0);
        return ret;
      },
    },
  }
);


AcademicPostSchema.pre("validate", function (next) {
  this.mode = normalizeMode(this);
  if (this.kind) this.kind = String(this.kind).toLowerCase().replace(/[\s-]+/g, "_");

  // seeking:course_materials일 때 title = courseName 로 자연정규화(있으면)
  if (this.mode === "looking_for" && this.kind === "course_materials") {
    if (this.courseName && !this.title) this.title = this.courseName;
  }
  next();
});

AcademicPostSchema.pre("save", function (next) {
  if (this.board === "academic" && !this.shortId) {
    this.shortId = nanoid(10); // length=10, URL-safe, fast
  }
  next();
});

module.exports = mongoose.model("AcademicPost", AcademicPostSchema);
