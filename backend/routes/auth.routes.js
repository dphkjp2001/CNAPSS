// backend/routes/auth.routes.js
const express = require("express");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EmailCode = require("../models/EmailCode");
const { sendVerificationEmail } = require("../services/sendVerificationEmail");
const requireAuth = require("../middleware/requireAuth");
const { requestCodeLimiter } = require("../middleware/rateLimits");

const router = express.Router();

// helpers
function generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0O1I
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function signToken(user) {
  return jwt.sign(
    { _id: user._id, email: user.email, school: user.school, name: user.name, role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
function isAllowedDomain(email) {
  const list = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return list.includes(domain);
}

// ... 기존 상단 동일
// 1) request code
router.post("/auth/request-code", requestCodeLimiter, async (req, res) => {
  try {
    const { email, school } = req.body || {};
    if (!email || !school) return res.status(400).json({ message: "Missing email/school" });
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });
    if (!isAllowedDomain(email)) return res.status(400).json({ message: "Email domain not allowed" });

    const ttl = 10; // ← 고정(EMAIL_CODE_TTL 환경변수 없이 10분)
    const code = generateCode(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await EmailCode.deleteMany({ email });
    await EmailCode.create({ email: email.toLowerCase(), codeHash, expiresAt, verified: false });

    await sendVerificationEmail({ to: email, code, ttlMinutes: ttl });
    res.json({ ok: true, ttlMinutes: ttl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send code" });
  }
});


// 2) register (with code)
router.post("/auth/register", async (req, res) => {
  try {
    const { email, school, name, password, code } = req.body || {};
    if (!email || !school || !password || !code) {
      return res.status(400).json({ message: "Missing fields" });
    }
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email" });
    if (!isAllowedDomain(email)) return res.status(400).json({ message: "Email domain not allowed" });

    const rec = await EmailCode.findOne({ email: email.toLowerCase() });
    if (!rec) return res.status(400).json({ message: "Code not requested" });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "Code expired" });
    const ok = await bcrypt.compare(code, rec.codeHash);
    if (!ok) {
      // bump attempts
      await EmailCode.updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid code" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) return res.status(409).json({ message: "Email already registered" });

    user = new User({ email: email.toLowerCase(), school, name: name || "", isVerified: true });
    await user.setPassword(password);
    await user.save();

    await EmailCode.updateOne({ _id: rec._id }, { $set: { verified: true } });

    const token = signToken(user);
    res.status(201).json({ token, user: { _id: user._id, email: user.email, school: user.school, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Register failed" });
  }
});

// 3) login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Missing email/password" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.isVerified) return res.status(403).json({ message: "Email not verified" });

    const token = signToken(user);
    res.json({ token, user: { _id: user._id, email: user.email, school: user.school, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// 4) me
router.get("/auth/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
