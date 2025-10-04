// backend/middleware/requireAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Missing token", code: "NO_TOKEN" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET); // 만료/서명 검증
    // school 등 멀티테넌트 정보도 사용자에서 보강
    const user = await User.findOne({ email: payload.email }).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found", code: "INVALID_USER" });
    }

    req.user = {
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      role: user.role || "user",
      school: user.school, // schoolGuard에서 최종 검증
    };
    next();
  } catch (err) {
    // 만료는 별도 코드로 클라이언트가 구분할 수 있게
    if (err && err.name === "TokenExpiredError") {
      res.setHeader("x-token-expired", "1");
      return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid token", code: "INVALID_TOKEN" });
  }
};

