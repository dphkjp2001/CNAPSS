// backend/middleware/requireAuth.js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ code: "UNAUTHORIZED", message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // ✅ req.user 세팅
    req.user = {
      id: decoded.id,
      email: decoded.email,
      school: decoded.school,
      role: decoded.role || "user",
    };

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
