// backend/middleware/commentCooldown.js
const Comment = require("../models/Comment");

function commentCooldown(seconds = 60) {
  return async function(req, res, next) {
    try {
      const { postId } = req.params;
      const last = await Comment.findOne({ postId, authorId: req.user._id })
        .sort({ createdAt: -1 }).lean();
      if (!last) return next();
      const diff = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (diff < seconds) {
        const retryAfter = Math.ceil(seconds - diff);
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({ message: `Please wait ${retryAfter}s before commenting again on this post.` });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { commentCooldown };
