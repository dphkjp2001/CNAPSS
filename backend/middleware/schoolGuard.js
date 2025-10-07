// backend/middleware/schoolGuard.js
const ACTIVE_SCHOOLS = new Set(["nyu"]);

module.exports = function schoolGuard(req, res, next) {
  const urlSchool = (req.params.school || "").toLowerCase().trim();
  const userSchool = (req.user?.school || "").toLowerCase().trim();
  const role = req.user?.role || "user";

  // superadmin can cross schools even if inactive
  if (role === "superadmin") {
    req.school = urlSchool;
    return next();
  }

  // ❗️Inactive school short-circuit
  if (!ACTIVE_SCHOOLS.has(urlSchool)) {
    return res
      .status(403)
      .json({ code: "SCHOOL_INACTIVE", message: "Coming soon for this school." });
  }

  if (!urlSchool || !userSchool || urlSchool !== userSchool) {
    return res
      .status(403)
      .json({ code: "SCHOOL_FORBIDDEN", message: "Forbidden: wrong school tenant." });
  }

  req.school = urlSchool;
  next();
};

  