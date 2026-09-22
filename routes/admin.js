const express = require('express');
const router  = express.Router();
const User      = require('../models/User');
const Case      = require('../models/Case');
const Complaint = require('../models/Complaint');
const Flag      = require('../models/Flag');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, cases, complaints, flags, openFlags, criticalComplaints] = await Promise.all([
      User.countDocuments(),
      Case.countDocuments(),
      Complaint.countDocuments(),
      Flag.countDocuments(),
      Flag.countDocuments({ resolved: false }),
      Complaint.countDocuments({ priority: 'critical', status: { $ne: 'closed' } })
    ]);
    res.json({ success: true, data: { users, cases, complaints, flags, openFlags, criticalComplaints } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -otp').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/admin/users/:id/block
router.patch('/users/:id/block', async (req, res) => {
  try {
    const { blocked, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: blocked, blockReason: reason || '' },
      { new: true, select: '-password -otp' }
    );
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['reporter','police','admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, select: '-password -otp' });
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/complaints
router.get('/complaints', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    const complaints = await Complaint.find(filter).sort({ filed_at: -1 });
    res.json({ success: true, data: complaints });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/admin/complaints/:id
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { status, admin_notes, forwarded_to, priority } = req.body;
    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(admin_notes && { admin_notes }),
        ...(forwarded_to && { forwarded_to }), ...(priority && { priority }) },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/flags
router.get('/flags', async (req, res) => {
  try {
    const filter = {};
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';
    const flags = await Flag.find(filter).sort({ flagged_at: -1 }).limit(200);
    res.json({ success: true, data: flags });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/admin/flags/:id/resolve
router.patch('/flags/:id/resolve', async (req, res) => {
  try {
    const updated = await Flag.findByIdAndUpdate(req.params.id, {
      resolved: true, resolved_by: req.user.name,
      resolved_at: new Date(), resolution: req.body.resolution || 'Reviewed'
    }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/admin/cases/:id  (admin can hard-delete any case)
router.delete('/cases/:id', async (req, res) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Case deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
