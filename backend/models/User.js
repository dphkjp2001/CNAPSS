// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    nickname: { type: String, required: true, unique: true, trim: true },

    // school tenancy
    school: { type: String, required: true, index: true, lowercase: true, trim: true },

    // verification / roles
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: "user" },

    // NEW: Cohort (Class of YYYY). We keep it simple for MVP.
    classOf: {
      type: Number,
      // allow a wide but safe range; UI will guide typical 4–6yr window
      min: 2000,
      max: 2100,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

