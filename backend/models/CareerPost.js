// backend/models/CareerPost.js
const mongoose = require("mongoose");

<<<<<<< HEAD
const careerPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },

    nickname: { type: String, required: true }, // display
    email: { type: String, required: true },    // author identity
    thumbsUpUsers: { type: [String], default: [] },

    // School scope: always lowercase
=======
/**
 * Academic board post
 * - postType: 'question' | 'seeking'   (legacy 'looking_for' accepted on input, stored as 'seeking')
 * - kind: 'course_materials' | 'study_mate' | 'coffee_chat' (only for seeking)
 * - content: optional for seeking (users may post short title only)
 */
const careerPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },

    // author
    nickname: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },

    // reactions
    thumbsUpUsers: { type: [String], default: [] }, // lowercased emails

    // school tenant
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
    school: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["nyu", "columbia", "boston"],
      index: true,
    },

<<<<<<< HEAD
    createdAt: { type: Date, default: Date.now },
=======
    // ===== Classification =====
    postType: {
      type: String,
      enum: ["question", "seeking"],
      default: "question",
      index: true,
    },
    // only meaningful when postType === 'seeking'
    kind: {
      type: String,
      enum: ["course_materials", "study_mate", "coffee_chat", ""],
      default: "",
      index: true,
    },

    // legacy flags kept for compatibility (do not rely on them for queries)
    type: { type: String, default: "" }, // legacy mirror of postType (e.g., 'question' | 'looking_for')
    lookingFor: { type: Boolean, default: false },
    isLookingFor: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
>>>>>>> f2287354f8462a2325c134a89862ed85319e742d
  },
  { timestamps: true }
);

// indices
careerPostSchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model("CareerPost", careerPostSchema);
