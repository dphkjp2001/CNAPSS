// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    school: { type: String, required: true, index: true }, // e.g., "nyu"
    name: { type: String, default: "" },
    nickname: { type: String, default: "" },
    avatar: { type: String, default: "" },
    role: { type: String, default: "user" },
    isVerified: { type: Boolean, default: false },
    passwordHash: { type: String, default: "" },
    points: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// methods
UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};
UserSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash || "");
};

module.exports = mongoose.model("User", UserSchema);
