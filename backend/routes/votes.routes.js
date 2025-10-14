const express = require("express");
const router = express.Router();
const voteService = require("../services/vote.service");
const requireAuth = require("../middleware/requireAuth");
const schoolGuard = require("../middleware/schoolGuard");

/**
 * Cast a vote for a post or comment
 * @route POST /api/votes/:targetType/:targetId
 */
router.post("/:targetType/:targetId", requireAuth, schoolGuard, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { value } = req.body;
    const userId = req.user._id;

    if (!["Post", "Comment"].includes(targetType)) {
      return res.status(400).json({ error: "Invalid target type" });
    }

    if (![1, 0, -1].includes(value)) {
      return res.status(400).json({ error: "Invalid vote value" });
    }

    const result = await voteService.vote({
      userId,
      targetType,
      targetId,
      value
    });

    res.json(result);

  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Failed to cast vote" });
  }
});

/**
 * Get votes for multiple targets
 * @route GET /api/votes/:targetType
 */
router.get("/:targetType", requireAuth, schoolGuard, async (req, res) => {
  try {
    const { targetType } = req.params;
    const { targetIds } = req.query;
    const userId = req.user._id;

    if (!["Post", "Comment"].includes(targetType)) {
      return res.status(400).json({ error: "Invalid target type" });
    }

    if (!targetIds || !Array.isArray(targetIds)) {
      return res.status(400).json({ error: "targetIds must be an array" });
    }

    const votes = await voteService.getVotesForTargets({
      userId,
      targetType,
      targetIds
    });

    res.json(votes);

  } catch (error) {
    console.error("Get votes error:", error);
    res.status(500).json({ error: "Failed to get votes" });
  }
});

module.exports = router;