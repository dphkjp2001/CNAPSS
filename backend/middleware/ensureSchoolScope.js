// // backend/middleware/schoolGuard.js
// const ACTIVE_SCHOOLS = new Set(["nyu"]);

// module.exports = function schoolGuard(req, res, next) {
//   const urlSchool = (req.params.school || "").toLowerCase().trim();
//   const userSchool = (req.user?.school || "").toLowerCase().trim();
//   const role = req.user?.role || "user";

//   // superadmin can cross schools even if inactive
//   if (role === "superadmin") {
//     req.school = urlSchool;
//     return next();
//   }





// backend/middleware/ensureSchoolScope.js
/**
 * If route has :school param, enforce it equals req.user.school
 */
module.exports = function ensureSchoolScope(req, res, next) {
  const { school } = req.params || {};
  if (!school) return next();
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.school !== school) {
    return res.status(403).json({ message: "School scope mismatch" });
  }
  next();
};




  