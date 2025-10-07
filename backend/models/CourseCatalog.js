// backend/models/CourseCatalog.js
const mongoose = require("mongoose");

const courseCatalogSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true }, // e.g., "CS-UY 1133"
    title: { type: String, default: "", trim: true },
    aliases: { type: [String], default: [] },      // optional
    semesters: { type: [String], default: [] },    // e.g., ["2025-fall"]
    searchTokens: { type: [String], default: [] }, // optional
  },
  { timestamps: true }
);

courseCatalogSchema.index({ school: 1, code: 1 }, { unique: true });
courseCatalogSchema.index({ school: 1, title: 1 });

module.exports = mongoose.model("CourseCatalog", courseCatalogSchema);
