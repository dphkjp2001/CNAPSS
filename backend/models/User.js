// // backend/models/User.js
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema(
//   {
//     email: { type: String, required: true, unique: true },
//     nickname: { type: String, required: true },
//     password: { type: String, required: true },
//     isVerified: { type: Boolean, default: false },

//     // ✅ 소속 학교
//     school: {
//       type: String,
//       required: true,
//       enum: ["nyu", "columbia", "boston"], // 원하는 학교 코드만
//       index: true,
//     },

//     friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//     friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//     sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);


// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },

    // ✅ 소속 학교
    school: {
      type: String,
      required: true,
      enum: ["nyu", "columbia", "boston"], // 원하는 학교 코드만
      index: true,
    },

    // ✅ 역할 (기본 user, 필요 시 admin/superadmin)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

