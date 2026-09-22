const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const User     = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/mailer');
const { createFlag, flagUser } = require('../utils/flagging');

const signToken = u => jwt.sign(
  { id: u._id, name: u.name, email: u.email, role: u.role },
  process.env.JWT_SECRET, { expiresIn: '7d' }
);

function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, badge, district } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, password required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const otp     = genOTP();
    const hashed  = await bcrypt.hash(otp, 8);
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    const user = await User.create({
      name, email, password,
      role: role || 'reporter', phone, badge, district,
      otp: hashed, otpExpires: expires, emailVerified: false
    });
    const emailSent = await sendOTPEmail(email, otp, name);
    res.status(201).json({
      success: true,
      requireOTP: true,
      emailSent,
      message: emailSent
        ? 'Registered! Check your email for OTP to verify.'
        : 'Registered! Email not configured — use OTP: ' + otp,
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.otpAttempts >= 5) {
      await flagUser(userId, 'Too many OTP attempts', req);
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
    }
    if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }
    const valid = await bcrypt.compare(otp, user.otp);
    if (!valid) {
      await User.findByIdAndUpdate(userId, { $inc: { otpAttempts: 1 } });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    await User.findByIdAndUpdate(userId, {
      emailVerified: true, otp: null, otpExpires: null, otpAttempts: 0
    });
    const updatedUser = await User.findById(userId);
    const token = signToken(updatedUser);
    res.json({
      success: true,
      token,
      user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const otp     = genOTP();
    const hashed  = await bcrypt.hash(otp, 8);
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(userId, { otp: hashed, otpExpires: expires, otpAttempts: 0 });
    const emailSent = await sendOTPEmail(user.email, otp, user.name);
    res.json({
      success: true,
      message: emailSent ? 'New OTP sent to email' : 'Email not configured — OTP: ' + otp
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.isBlocked)
      return res.status(403).json({ success: false, message: 'Account blocked: ' + (user.blockReason || 'Contact admin') });
    if (user.isLocked())
      return res.status(429).json({ success: false, message: 'Account temporarily locked. Try again later.' });
    const match = await user.matchPassword(password);
    if (!match) {
      const attempts = (user.loginAttempts || 0) + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= 5) {
        update.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        update.loginAttempts = 0;
        await createFlag('brute_force', 'high', 'user', user._id, 'Multiple failed login attempts', req);
      }
      await User.findByIdAndUpdate(user._id, update);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    await User.findByIdAndUpdate(user._id, { loginAttempts: 0, lockUntil: null });
    const token = signToken(user);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
