const mongoose = require("mongoose");
const Vote = require("../models/Vote");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { calculateHotScore, calculateTier, calculateVoteDelta } = require("../utils/vote.utils");

/**
 * Vote service class for handling all vote-related operations
 */
class VoteService {
  /**
   * Cast or update a vote
   * @param {Object} params Vote parameters
   * @param {string} params.userId ID of voting user
   * @param {string} params.targetType "Post" or "Comment"
   * @param {string} params.targetId ID of target content
   * @param {number} params.value New vote value (-1, 0, 1)
   * @returns {Promise<Object>} Updated target and author info
   */
  async vote({ userId, targetType, targetId, value }) {
    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    let result = null;

    try {
      await session.withTransaction(async () => {
        // 1. Get or create vote record
        let voteDoc = await Vote.findOne({
          user: userId,
          targetType,
          targetId
        }).session(session);

        const oldValue = voteDoc?.value || 0;
        const delta = calculateVoteDelta(oldValue, value);

        // 2. Update or create vote
        if (voteDoc) {
          if (value === 0) {
            await Vote.deleteOne({ _id: voteDoc._id }).session(session);
          } else {
            voteDoc.value = value;
            await voteDoc.save({ session });
          }
        } else if (value !== 0) {
          await Vote.create([{
            user: userId,
            targetType,
            targetId,
            value
          }], { session });
        }

        // 3. Update target content
        // const Model = targetType === "Post" ? Post : Comment;
        const AcademicPost = require("../models/AcademicPost");

        let Model;
        if (targetType === "Post") Model = Post;
        else if (targetType === "Comment") Model = Comment;
        else if (targetType === "AcademicPost") Model = AcademicPost;
        else throw new Error("Unsupported targetType");
        
        const target = await Model.findById(targetId).session(session);
        if (!target) throw new Error("Target not found");

        // Initialize counts if they don't exist
        if (!target.counts) target.counts = { up: 0, down: 0 };
        
        // Update vote counts
        target.counts.up += delta.up;
        target.counts.down += delta.down;
        
        // Recalculate hot score
        target.hotScore = calculateHotScore(
          target.counts.up,
          target.counts.down,
          target.createdAt
        );

        await target.save({ session });

        // 4. Update author's reputation
        const authorId = target.author || target.authorId;
        const netDelta = delta.up - delta.down;
        
        const author = await User.findById(authorId).session(session);
        if (!author) throw new Error("Author not found");

        // Initialize netUpvotes if it doesn't exist
        if (typeof author.netUpvotes !== "number") author.netUpvotes = 0;
        
        author.netUpvotes += netDelta;
        author.tier = calculateTier(author.netUpvotes);
        
        await author.save({ session });

        // 5. Prepare return value
        result = {
          target: {
            _id: target._id,
            counts: target.counts,
            hotScore: target.hotScore
          },
          author: {
            _id: author._id,
            netUpvotes: author.netUpvotes,
            tier: author.tier
          },
          myVote: value
        };
      });

      return result;

    } finally {
      await session.endSession();
    }
  }

  /**
   * Get vote counts and user's vote for multiple targets
   * @param {Object} params Query parameters
   * @param {string} params.userId User ID to check votes for
   * @param {string} params.targetType "Post" or "Comment"
   * @param {string[]} params.targetIds Array of target IDs
   * @returns {Promise<Object>} Map of target IDs to vote info
   */
  async getVotesForTargets({ userId, targetType, targetIds }) {
    const targets = await Vote.aggregate([
      {
        $match: {
          targetType,
          targetId: { $in: targetIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: "$targetId",
          up: {
            $sum: { $cond: [{ $eq: ["$value", 1] }, 1, 0] }
          },
          down: {
            $sum: { $cond: [{ $eq: ["$value", -1] }, 1, 0] }
          },
          myVote: {
            $max: {
              $cond: [
                { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                "$value",
                null
              ]
            }
          }
        }
      }
    ]);

    // Convert to map for easy lookup
    return targets.reduce((map, t) => {
      map[t._id] = {
        counts: { up: t.up, down: t.down },
        myVote: t.myVote || 0
      };
      return map;
    }, {});
  }
}

module.exports = new VoteService();