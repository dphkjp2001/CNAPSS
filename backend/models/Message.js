// // backend/models/Message.js
// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//   {
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: "Conversation",
//       index: true,
//     },
//     sender: { type: String, required: true, lowercase: true }, // email
//     content: { type: String, required: true, trim: true },

//     readBy: { type: [String], default: [] }, // emails (lowercase)

//     // ✅ duplicate school for filtering/guard
//     school: {
//       type: String,
//       required: true,
//       lowercase: true,
//       enum: ["nyu", "columbia", "boston"],
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// messageSchema.index({ school: 1, conversationId: 1, createdAt: 1 });

// module.exports = mongoose.model("Message", messageSchema);



// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: String, required: true, index: true }, // email
    content: { type: String, required: true },
    readBy: { type: [String], default: [] }, // emails who read

    // 🔐 tenant scope
    school: { type: String, required: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);



