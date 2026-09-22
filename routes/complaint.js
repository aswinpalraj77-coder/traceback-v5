const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const Complaint = require('../models/Complaint');
const { createFlag } = require('../utils/flagging');

// POST /api/complaint  — anonymous, no auth required
router.post('/', async (req, res) => {
  try {
    const {
      category, victim_age, victim_gender, victim_description,
      suspect_name, suspect_description, suspect_location, suspect_phone,
      incident_date, incident_location, incident_details, evidence_description,
      contact_email, contact_phone
    } = req.body;

    if (!category || !incident_details)
      return res.status(400).json({ success: false, message: 'Category and incident details required' });

    // Hash IP for dedup/spam detection — never store raw IP
    const rawIP  = req.ip || req.connection.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(rawIP + process.env.JWT_SECRET).digest('hex').slice(0, 16);

    // Spam guard: max 3 complaints per IP hash per 24h
    const since     = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCnt = await Complaint.countDocuments({ ip_hash: ipHash, filed_at: { $gte: since } });
    if (recentCnt >= 3) {
      await createFlag('complaint_spam', 'high', 'ip', ipHash, 'Too many complaints from same IP', req);
      return res.status(429).json({ success: false, message: 'Too many submissions. Please try again tomorrow.' });
    }

    const now  = new Date();
    const cno  = `CP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`;
    const priority = ['pocso','trafficking'].includes(category) ? 'critical' : category === 'abuse' ? 'urgent' : 'normal';

    const saved = await Complaint.create({
      complaint_number: cno,
      category, victim_age, victim_gender, victim_description,
      suspect_name, suspect_description, suspect_location, suspect_phone,
      incident_date, incident_location, incident_details, evidence_description,
      contact_email: contact_email || '', contact_phone: contact_phone || '',
      priority, ip_hash: ipHash
    });

    // Emit socket alert for admin
    const io = req.app.get('io');
    if (io) io.emit('new_complaint', {
      id: saved._id, complaint_number: cno,
      category, priority,
      snippet: incident_details.slice(0, 80) + '...'
    });

    res.status(201).json({
      success: true,
      complaint_number: cno,
      priority,
      message: 'Complaint received confidentially. Reference: ' + cno
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
