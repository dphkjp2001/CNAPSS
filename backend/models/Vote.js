const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: ["Post", "Comment"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: Number, enum: [-1, 0, 1], required: true },
}, { 
  timestamps: true,
  // Optimize queries we'll be doing frequently
  indexes: [
    // For checking user's existing votes
    { user: 1, targetType: 1, targetId: 1, unique: true },
    // For aggregating votes by target
    { targetType: 1, targetId: 1, value: 1 },
  ]
});

module.exports = mongoose.model("Vote", VoteSchema);