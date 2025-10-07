// backend/models/Notification.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    school: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // 수신자
    type: {
      type: String,
      enum: [
        "comment_on_post",
        "request_created",
        "request_accepted",
        "request_rejected",
        "request_cancelled"
      ],
      required: true,
      index: true
    },
    data: {
      // 프론트에서 라우팅/표시용으로 쓰는 최소 정보
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
      requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
