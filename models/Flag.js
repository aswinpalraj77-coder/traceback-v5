const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['spam_report', 'duplicate_report', 'false_info', 'bot_attempt', 'brute_force', 'suspicious_scan', 'complaint_spam'],
    required: true
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  // What was flagged
  target_type:  { type: String, enum: ['user', 'case', 'complaint', 'ip', 'scan'] },
  target_id:    String,   // userId, caseId, IP, etc.
  target_email: String,

  description:  String,
  ip_address:   String,
  user_agent:   String,

  resolved:     { type: Boolean, default: false },
  resolved_by:  String,
  resolved_at:  Date,
  resolution:   String,

  auto_flagged: { type: Boolean, default: true },  // true = system, false = manual

}, { timestamps: { createdAt: 'flagged_at' } });

module.exports = mongoose.model('Flag', flagSchema);
