const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['reporter', 'police', 'admin'], default: 'reporter' },
  phone:    String,
  badge:    String,
  district: String,

  // OTP verification
  emailVerified: { type: Boolean, default: false },
  otp:           String,
  otpExpires:    Date,
  otpAttempts:   { type: Number, default: 0 },

  // Security / spam
  isBlocked:    { type: Boolean, default: false },
  blockReason:  String,
  flagCount:    { type: Number, default: 0 },
  lastFlaggedAt: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil:    Date,

}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = function (p) { return bcrypt.compare(p, this.password); };
userSchema.methods.isLocked      = function ()  { return this.lockUntil && this.lockUntil > Date.now(); };

module.exports = mongoose.model('User', userSchema);
