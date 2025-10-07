// backend/middleware/requireAuth.js
// (네가 올린 파일과 역할 동일, 내부를 명확하게 정리)
const jwt = require("jsonwebtoken");

/**
 * Verifies JWT from "Authorization: Bearer <token>"
 * Attaches req.user = { _id, email, school, name, role }
 */
module.exports = function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Missing token", code: "NO_TOKEN" });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: payload._id,
      email: payload.email,
      school: payload.school,
      name: payload.name || "",
      role: payload.role || "user"
    };
    next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      res.setHeader("x-token-expired", "1");
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid token", code: "INVALID_TOKEN" });
  }
};


