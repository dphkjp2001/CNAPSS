// backend/models/Material.js
const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
  {
    // Multi-tenancy scope
    school: { type: String, required: true, index: true, lowercase: true },

    // Who uploaded
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    uploaderEmail: { type: String, index: true },

    // Course info
    courseCode: { type: String, index: true }, // e.g., "CSCI-UA 101"
    courseTitle: { type: String },

    // File meta
    title: { type: String, required: true, trim: true }, // short title shown in UI
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["syllabus", "notes", "exam", "assignment", "book", "other"],
      default: "other",
      index: true,
    },

    fileUrl: { type: String },        // Cloudinary or S3 URL
    filePublicId: { type: String },   // Cloudinary public_id (optional)
    fileSize: { type: Number },       // bytes
    mimeType: { type: String },

    // Flexible extra fields
    meta: { type: Object, default: {} },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

MaterialSchema.pre("save", function (next) {
  if (this.school) this.school = String(this.school).toLowerCase();
  next();
});

MaterialSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.models.Material || mongoose.model("Material", MaterialSchema);
