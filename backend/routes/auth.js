// 📁 파일 경로: backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendVerificationEmail = require('../utils/sendVerificationEmail');


// ✅ Register (Resend 링크 방식)
router.post('/register', async (req, res) => {
  try {
    let { email, nickname, password } = req.body;
    email = email.toLowerCase();

    const allowedEmailRegex = /^[a-zA-Z0-9._%+-]+@(nyu\.edu|gmail\.com)$/;
    if (!allowedEmailRegex.test(email)) {
      return res.status(400).json({ message: 'Only NYU or Gmail addresses are allowed.' });
    }

    const existingEmail = await User.findOne({ email });
    const existingNickname = await User.findOne({ nickname });
    if (existingEmail) return res.status(400).json({ message: 'This email is already in use.' });
    if (existingNickname) return res.status(400).json({ message: 'This nickname is already taken.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, nickname, password: hashedPassword });

    await newUser.save();

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // ✅ 응답 먼저 보내고 비동기로 메일 전송
    res.status(200).json({ message: 'Registration successful. Please check your email to verify your account.' });

    sendVerificationEmail(email, token)
      .then(() => console.log(`✅ Verification email sent to ${email}`))
      .catch((error) => {
        console.error(`❌ Failed to send verification email to ${email}:`, error);
      });

  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});


// ✅ 이메일 인증 링크 확인 (GET /api/auth/verify?token=...)
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.send(`
        <h2>User does not exist.</h2>
        <script>
          setTimeout(() => {
            window.location.href = 'https://www.cnapss.com/login?verified=fail';
          }, 3000);
        </script>
      `);
    }

    if (user.isVerified) {
      return res.send(`
        <h2>This account has already been verified.</h2>
        <script>
          setTimeout(() => {
            window.location.href = 'https://www.cnapss.com/login?verified=already';
          }, 3000);
        </script>
      `);
    }

    user.isVerified = true;
    await user.save();

    return res.send(`
      <h2>✅ Email verification complete!</h2>
      <script>
        window.location.href = 'https://www.cnapss.com/login?verified=success';
      </script>
    `);

  } catch (err) {
    console.error('Email verification failed:', err);
    return res.send(`
      <h2>The verification link is invalid or has expired.</h2>
      <script>
        setTimeout(() => {
          window.location.href = 'https://www.cnapss.com/login?verified=fail';
        }, 3000);
      </script>
    `);
  }
});


// ✅ Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified yet" });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        nickname: user.nickname,
        verified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});


// ✅ 이메일 존재 여부 확인
router.get("/exists", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    console.error("Error checking user existence:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;




