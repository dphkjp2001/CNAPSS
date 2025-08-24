// backend/middleware/schoolGuard.js
module.exports = function schoolGuard(req, res, next) {
    const urlSchool = (req.params.school || "").toLowerCase().trim();
    const userSchool = (req.user?.school || "").toLowerCase().trim();
    const role = req.user?.role || "user";
  
    // superadmin만 크로스 접근 허용
    if (role === "superadmin") {
      req.school = urlSchool;
      return next();
    }
  
    if (!urlSchool || !userSchool || urlSchool !== userSchool) {
      return res.status(403).json({ code: "SCHOOL_FORBIDDEN", message: "Forbidden: wrong school tenant." });
    }
  
    req.school = urlSchool; // convenience
    next();
  };
  