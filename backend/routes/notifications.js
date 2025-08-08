// ✅ backend/routes/notification.js
const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");

// NOTE:
// - We treat "notifications" as comments that target the user:
//   A) comments on user's posts
//   B) replies to user's comments
// - Unread = target comment where readBy does NOT contain the user's email
// - We exclude comments authored by the user themselves (email !== me)

// Helper to build the base filter for a given user email
async function buildTargetFilter(email) {
  // 1) Post ids authored by the user
  const myPosts = await Post.find({ email }).select("_id").lean();
  const postIds = myPosts.map((p) => p._id);

  // 2) Comment ids authored by the user
  const myComments = await Comment.find({ email }).select("_id").lean();
  const commentIds = myComments.map((c) => c._id);

  // 3) Comments that target me (someone else commented on my post or replied to my comment)
  const baseFilter = {
    $or: [
      { postId: { $in: postIds } },     // comments on my posts
      { parentId: { $in: commentIds } } // replies to my comments
    ],
    email: { $ne: email } // exclude my own comments
  };

  return { baseFilter, postIds, commentIds };
}

// 🔔 Get notifications list
// GET /api/notification/:email?limit=20&cursor=<ISO string or ms>
// - limit: number of items (default 20, max 100)
// - cursor: return items created BEFORE this timestamp (for pagination)
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

  try {
    const { baseFilter } = await buildTargetFilter(email);

    const filter = { ...baseFilter };
    if (cursor && !isNaN(cursor.getTime())) {
      filter.createdAt = { $lt: cursor };
    }

    const items = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // nextCursor for infinite scroll
    const nextCursor = items.length > 0 ? items[items.length - 1].createdAt : null;

    res.json({
      items,
      nextCursor
    });
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// 🔢 Unread count
// GET /api/notification/:email/unread-count
router.get("/:email/unread-count", async (req, res) => {
  const { email } = req.params;

  try {
    const { baseFilter } = await buildTargetFilter(email);
    const count = await Comment.countDocuments({
      ...baseFilter,
      readBy: { $ne: email }
    });

    res.json({ count });
  } catch (err) {
    console.error("❌ Failed to fetch unread count:", err);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

// ✅ Mark single notification as read
// PATCH /api/notification/:email/mark-read/:commentId
router.patch("/:email/mark-read/:commentId", async (req, res) => {
  const { email, commentId } = req.params;
  try {
    await Comment.findByIdAndUpdate(commentId, {
      $addToSet: { readBy: email } // idempotent
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to mark as read:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

// ✅ Mark all notifications as read
// PATCH /api/notification/:email/mark-all-read
router.patch("/:email/mark-all-read", async (req, res) => {
  const { email } = req.params;

  try {
    const { baseFilter } = await buildTargetFilter(email);

    await Comment.updateMany(
      {
        ...baseFilter,
        readBy: { $ne: email }
      },
      { $addToSet: { readBy: email } }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Failed to mark all as read:", err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// (Optional) Recent-only endpoint preserved, but generalized via query params:
// GET /api/notification/:email/recent?seconds=60
router.get("/:email/recent", async (req, res) => {
  const { email } = req.params;
  const seconds = Math.max(1, Number(req.query.seconds) || 60);
  try {
    const { baseFilter } = await buildTargetFilter(email);

    const since = new Date(Date.now() - seconds * 1000);
    const items = await Comment.find({
      ...baseFilter,
      createdAt: { $gt: since }
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (err) {
    console.error("❌ Failed to fetch recent notifications:", err);
    res.status(500).json({ message: "Failed to fetch recent notifications" });
  }
});

module.exports = router;

/**
 * Mounting (in app.js or app router):
 * const notificationRoute = require("./routes/notification");
 * app.use("/api/notification", authMiddlewareOptional, notificationRoute);
 *
 * TODO (security):
 *  - Replace :email param usage with authenticated user: req.user.email
 *    and remove :email from the route paths.
 */

