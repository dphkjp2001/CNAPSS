// backend/models/Professor.js
const mongoose = require("mongoose");

const ProfessorSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, lowercase: true, trim: true, index: true },
    // Human name: we keep as-is (case sensitive) but add a normalized field for search
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true, lowercase: true, trim: true },

    department: { type: String, default: "", trim: true },
    aliases: { type: [String], default: [] },          // e.g., ["J. Kim", "Prof. Kim"]
    searchTokens: { type: [String], default: [] },     // optional: extra tokens for search

    // Optional metadata you might show on the profile page later
    photoUrl: { type: String, default: "" },           // do not fetch/host; user-provided only if any
    profileNote: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

// A professor name should be unique within a school.
// We use nameNormalized to avoid case/space issues.
ProfessorSchema.index({ school: 1, nameNormalized: 1 }, { unique: true });

// Convenience setter to auto-fill nameNormalized
ProfessorSchema.pre("validate", function (next) {
  if (this.name && !this.nameNormalized) {
    this.nameNormalized = this.name.toLowerCase().trim();
  }
  next();
});

module.exports = mongoose.model("Professor", ProfessorSchema);
