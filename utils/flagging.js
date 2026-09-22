const Flag = require('../models/Flag');
const User = require('../models/User');

// Auto-create a flag record
async function createFlag(type, severity, targetType, targetId, description, req) {
  try {
    await Flag.create({
      type, severity,
      target_type:  targetType,
      target_id:    String(targetId),
      target_email: req?.body?.email || '',
      description,
      ip_address:   req?.ip || '',
      user_agent:   req?.headers?.['user-agent'] || '',
      auto_flagged: true
    });
  } catch (e) { console.error('Flag creation failed:', e.message); }
}

// Increment user flag counter; auto-block if threshold crossed
async function flagUser(userId, reason, req) {
  try {
    const user = await User.findByIdAndUpdate(userId,
      { $inc: { flagCount: 1 }, lastFlaggedAt: new Date() },
      { new: true }
    );
    if (user && user.flagCount >= 5 && !user.isBlocked) {
      await User.findByIdAndUpdate(userId, { isBlocked: true, blockReason: 'Auto-blocked: repeated suspicious activity' });
    }
    await createFlag('spam_report', user?.flagCount >= 3 ? 'high' : 'medium', 'user', userId, reason, req);
  } catch (e) { console.error('flagUser failed:', e.message); }
}

module.exports = { createFlag, flagUser };
