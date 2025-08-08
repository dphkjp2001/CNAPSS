// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailCode = require('../models/EmailCode');
const sendVerificationEmail = require('../utils/sendVerificationEmail');

// Helpers
function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; // avoid 0/O/1/I
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// POST /auth/send-code  { email }
router.post('/send-code', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    email = email.toLowerCase().trim();

    // Throttle: 1 request / 60s
    const last = await EmailCode.findOne({ email, verified: false }).sort({ createdAt: -1 });
    if (last && Date.now() - last.createdAt.getTime() < 60 * 1000) {
      return res.status(429).json({ message: 'Please wait before requesting another code.' });
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const ttlMinutes = 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await EmailCode.create({ email, codeHash, expiresAt });

    await sendVerificationEmail({ to: email, code, ttlMinutes });

    return res.json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error('send-code error:', err);
    return res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

// POST /auth/verify-code { email, code }
router.post('/verify-code', async (req, res) => {
  try {
    let { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
    email = email.toLowerCase().trim();
    code = String(code).trim().toUpperCase();

    const rec = await EmailCode.findOne({ email }).sort({ createdAt: -1 });
    if (!rec) return res.status(400).json({ message: 'No code found. Please request a new one.' });
    if (rec.verified) return res.json({ message: 'Already verified.' });
    if (rec.expiresAt < new Date()) return res.status(400).json({ message: 'Code expired.' });
    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts.' });

    const ok = await bcrypt.compare(code, rec.codeHash);
    if (!ok) {
      rec.attempts += 1;
      await rec.save();
      return res.status(400).json({ message: 'Invalid code.' });
    }

    rec.verified = true;
    await rec.save();
    return res.json({ message: 'Verified.' });
  } catch (err) {
    console.error('verify-code error:', err);
    return res.status(500).json({ message: 'Failed to verify code.' });
  }
});

// POST /auth/register  { email, nickname, password }
router.post('/register', async (req, res) => {
  try {
    let { email, nickname, password } = req.body;
    if (!email || !nickname || !password) {
      return res.status(400).json({ message: 'Missing fields.' });
    }
    email = email.toLowerCase().trim();

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'This email is already in use.' });
    const existingNickname = await User.findOne({ nickname });
    if (existingNickname) return res.status(400).json({ message: 'This nickname is already taken.' });

    // Must be verified via code first
    const last = await EmailCode.findOne({ email }).sort({ createdAt: -1 });
    if (!last || !last.verified) {
      return res.status(400).json({ message: 'Please verify your email first.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, nickname, password: hashedPassword, isVerified: true });
    await newUser.save();

    // Optional: invalidate codes for this email
    // await EmailCode.deleteMany({ email });

    return res.status(200).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('❌ Registration failed:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login (unchanged)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });

    if (!user.isVerified) return res.status(403).json({ message: 'Email not verified yet' });

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      message: 'Login successful',
      token,
      user: { email: user.email, nickname: user.nickname, verified: user.isVerified },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Email exists (unchanged)
router.get('/exists', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Error checking user existence:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;




