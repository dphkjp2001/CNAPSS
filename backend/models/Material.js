// backend/models/Material.js
const mongoose = require("mongoose");

const ALLOWED_KINDS = ["note", "syllabus", "exam", "slide", "link", "other"];

// Frame 9: listing-oriented fields
const MATERIAL_TYPES = ["personalMaterial", "personalNote"]; // Personal Class Material | Personal Class Note
const SHARE_PREFERENCES = ["in_person", "online", "either"]; // in person | online | doesn't matter
const STATUSES = ["active", "archived", "sold"];

const materialSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, lowercase: true, trim: true },
    courseCode: { type: String, required: true, uppercase: true, trim: true }, // e.g., "CS-UY 1133"

    // Optional course title displayed with code (not used by Frame 9 UI yet, but harmless)
    courseTitle: { type: String, default: "", trim: true },

    semester: {
      type: String,
      required: true,
      trim: true, // "YYYY-(spring|summer|fall|winter)"
      match: /^[0-9]{4}-(spring|summer|fall|winter)$/i,
    },

    // Legacy fields (kept for compatibility)
    kind: { type: String, enum: ALLOWED_KINDS, default: "note", index: true },
    title: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },

    // Attachment (optional from now on for listings)
    fileUrl: { type: String, default: "" },
    filePublicId: { type: String, default: "" },
    fileMime: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    url: { type: String, default: "" },
    hash: { type: String, default: "" },

    // New for Frame 9
    materialType: { type: String, enum: MATERIAL_TYPES, default: "personalMaterial", index: true },
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0, min: 0 },
    sharePreference: { type: String, enum: SHARE_PREFERENCES, default: "either", index: true },
    status: { type: String, enum: STATUSES, default: "active", index: true },

    // Uploader info
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderEmail: { type: String, lowercase: true, trim: true },
    authorName: { type: String, trim: true },

    // Metrics
    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Helpful indexes
materialSchema.index({ school: 1, courseCode: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, semester: 1, createdAt: -1 });
materialSchema.index({ school: 1, courseCode: 1, kind: 1 });
materialSchema.index({ school: 1, courseCode: 1, materialType: 1, isFree: 1 });

module.exports = mongoose.model("Material", materialSchema);


