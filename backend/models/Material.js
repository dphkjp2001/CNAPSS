// backend/models/Material.js
const mongoose = require("mongoose");

const ALLOWED_KINDS = ["note", "syllabus", "exam", "slide", "link", "other"];

const materialSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, lowercase: true, trim: true },
    courseCode: { type: String, required: true, uppercase: true, trim: true }, // "CS-UY 1133"
    semester: {
      type: String,
      required: true,
      trim: true, // "YYYY-(spring|summer|fall|winter)"
      match: /^[0-9]{4}-(spring|summer|fall|winter)$/i,
    },

    kind: { type: String, enum: ALLOWED_KINDS, default: "note", index: true },
    title: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },

    // Either a file on Cloudinary OR an external URL
    fileUrl: { type: String, default: "" },
    filePublicId: { type: String, default: "" },
    fileMime: { type: String, default: "" },
    fileSize: { type: Number, default: 0 }, // bytes

    url: { type: String, default: "" },     // external link alternative
    hash: { type: String, default: "" },    // optional duplicate guard (sha256)

    // Uploader
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderEmail: { type: String, lowercase: true, trim: true },
    authorName: { type: String, trim: true }, // display name/nickname

    // Simple metrics
    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

materialSchema.index({ school: 1, courseCode: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, courseCode: 1, kind: 1 });

module.exports = mongoose.model("Material", materialSchema);
