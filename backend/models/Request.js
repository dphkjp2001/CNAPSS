// backend/models/Request.js
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },

    // academic post id
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    targetType: { type: String, default: "academic_post", index: true }, // for clarity

    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    type: { type: String, default: "academic_request", index: true },
    status: { type: String, default: "pending", index: true },

    message: { type: String, default: "" },

    // optional link to Conversation
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: null },

    // optional TTL
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// unique if both provided
RequestSchema.index(
  { targetId: 1, fromUser: 1 },
  {
    unique: true,
    name: "uniq_target_from_notnull",
    partialFilterExpression: { targetId: { $type: "objectId" }, fromUser: { $type: "objectId" } },
  }
);

// TTL only if expiresAt set
RequestSchema.index(
  { expiresAt: 1 },
  { name: "ttl_expiresAt_if_set", expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } }
);

module.exports = mongoose.model("Request", RequestSchema);










