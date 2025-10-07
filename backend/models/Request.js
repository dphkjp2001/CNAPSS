// backend/models/Request.js
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  school:     { type: String, required: true, index: true },
  postId:     { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  requesterId:{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message:    { type: String, default: "" },
  status:     { type: String, enum: ["pending","accepted","rejected","cancelled"], default: "pending", index: true }
}, { timestamps: true });

RequestSchema.index({ school: 1, postId: 1, requesterId: 1 }, { unique: true });

module.exports = mongoose.model("Request", RequestSchema);
