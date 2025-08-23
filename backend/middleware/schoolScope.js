// backend/middleware/schoolScope.js
module.exports.requireUserSchool = (req, res, next) => {
  if (!req.user || !req.user.school) {
    return res.status(403).json({ message: "School not set for current user." });
  }
  req.school = req.user.school; // convenience
  next();
};
