// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const EmailCode = require("../models/EmailCode");
const sendVerificationEmail = require("../utils/sendVerificationEmail");

// ==============================
// Config
// ==============================

const ALL_SCHOOLS = ["nyu", "columbia", "boston"];
const ACTIVE_SCHOOLS = new Set(["nyu"]);

const ALLOWED_BY_SCHOOL = (() => {
  try {
    return JSON.parse(process.env.ALLOWED_DOMAINS_BY_SCHOOL || '{"nyu":["nyu.edu"]}');
  } catch {
    return { nyu: ["nyu.edu"] };
  }
})();

const FLAT_ALLOWED = new Set(
  Object.entries(ALLOWED_BY_SCHOOL)
    .filter(([sch]) => ACTIVE_SCHOOLS.has(sch))
    .flatMap(([, arr]) => arr.map((d) => String(d).toLowerCase()))
);

const getDomain = (email) => String(email).toLowerCase().trim().split("@")[1] || "";
const ensureEmailAllowedForSchool = (email, school) => {
  const domain = getDomain(email);
  const allowed = (ALLOWED_BY_SCHOOL[school] || []).map((d) => d.toLowerCase());
  return allowed.includes(domain);
};

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "96h" });
}

function serializeUser(user) {
  return {
    email: user.email,
    nickname: user.nickname,
    school: user.school,
    role: user.role,
    verified: user.isVerified,
    classOf: user.classOf ?? null,
  };
}

// ==============================
// POST /auth/send-code {email}
// ==============================
router.post("/send-code", async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    email = String(email).toLowerCase().trim();

    if (!FLAT_ALLOWED.has(getDomain(email))) {
      return res.status(400).json({
        message: "For now, sign-up is limited to university emails (e.g., @nyu.edu).",
      });
    }

    const last = await EmailCode.findOne({ email, verified: false }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 60 * 1000) {
      return res.status(429).json({ message: "Please wait before requesting another code." });
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const ttlMinutes = 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await EmailCode.create({ email, codeHash, expiresAt });
    await sendVerificationEmail({ to: email, code, ttlMinutes });

    return res.json({ message: "Verification code sent." });
  } catch (err) {
    console.error("send-code error:", err);
    return res.status(500).json({ message: "Failed to send verification code." });
  }
});

// ==============================
// POST /auth/verify-code {email,code}
// ==============================
router.post("/verify-code", async (req, res) => {
  try {
    let { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code are required." });

    email = String(email).toLowerCase().trim();
    code = String(code).trim().toUpperCase();

    if (!FLAT_ALLOWED.has(getDomain(email))) {
      return res.status(400).json({
        message: "For now, sign-up is limited to university emails (e.g., @nyu.edu).",
      });
    }

    const rec = await EmailCode.findOne({ email }).sort({ createdAt: -1 });
    if (!rec) return res.status(400).json({ message: "No code found. Please request a new one." });
    if (rec.verified) return res.json({ message: "Already verified." });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: "Code expired." });
    if (rec.attempts >= 5) return res.status(429).json({ message: "Too many attempts." });

    const ok = await bcrypt.compare(code, rec.codeHash);
    if (!ok) {
      rec.attempts += 1;
      await rec.save();
      return res.status(400).json({ message: "Invalid code." });
    }

    rec.verified = true;
    await rec.save();
    return res.json({ message: "Verified." });
  } catch (err) {
    console.error("verify-code error:", err);
    return res.status(500).json({ message: "Failed to verify code." });
  }
});

// ==============================
// POST /auth/register {email, nickname, password, school, classOf}
// ==============================
router.post("/register", async (req, res) => {
  try {
    let { email, nickname, password, school, classOf } = req.body;
    if (!email || !nickname || !password || !school) {
      return res.status(400).json({ message: "Missing fields." });
    }

    email = String(email).toLowerCase().trim();
    school = String(school).toLowerCase().trim();

    if (!ALL_SCHOOLS.includes(school)) {
      return res.status(400).json({ message: "Invalid school." });
    }
    if (!ACTIVE_SCHOOLS.has(school)) {
      return res.status(403).json({ message: "This school is coming soon." });
    }
    if (!ensureEmailAllowedForSchool(email, school)) {
      const needs = (ALLOWED_BY_SCHOOL[school] || []).join(", ");
      return res.status(403).json({ message: `Please use your official school email (${needs}).` });
    }

    // classOf validation (optional but recommended)
    if (typeof classOf !== "number") {
      return res.status(400).json({ message: "Please select your class year (e.g., 2029)." });
    }
    if (classOf < 2000 || classOf > 2100) {
      return res.status(400).json({ message: "Invalid class year." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "This email is already in use." });

    const existingNickname = await User.findOne({ nickname });
    if (existingNickname) {
      return res.status(400).json({ message: "This nickname is already taken." });
    }

    const last = await EmailCode.findOne({ email }).sort({ createdAt: -1 });
    if (!last || !last.verified) {
      return res.status(400).json({ message: "Please verify your email first." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      nickname,
      password: hashedPassword,
      isVerified: true,
      school,
      classOf, // ✅ store cohort
    });

    const token = signJwt({
      id: newUser._id,
      email: newUser.email,
      school: newUser.school,
      role: newUser.role,
    });

    return res.status(200).json({
      message: "Registration successful.",
      token,
      user: serializeUser(newUser),
    });
  } catch (err) {
    console.error("❌ Registration failed:", err);
    return res.status(500).json({ message: "Server error during registration." });
  }
});

// ==============================
// POST /auth/login {email,password}
// ==============================
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields." });

    email = String(email).toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified yet" });
    }

    const token = signJwt({
      id: user._id,
      email: user.email,
      school: user.school,
      role: user.role,
    });

    return res.json({
      message: "Login successful",
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// ==============================
// GET /auth/exists?email=...
// ==============================
router.get("/exists", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    return res.json({ exists: !!user });
  } catch (err) {
    console.error("Error checking user existence:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;







