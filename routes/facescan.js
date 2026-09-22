const express    = require('express');
const router     = express.Router();
const Case       = require('../models/Case');
const nodemailer = require('nodemailer');

// ─── Nodemailer transporter (Gmail App Password) ───────────────────────────
// Set GMAIL_USER and GMAIL_PASS in your .env file
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS  // Gmail App Password (not regular password)
    }
  });
}

// POST /api/facescan/alert
// Called when frontend detects a face match
// Body: { caseId, matchScore, location, snapshotBase64 }
router.post('/alert', async (req, res) => {
  try {
    const { caseId, matchScore, location, snapshotBase64 } = req.body;

    const c = await Case.findById(caseId);
    if (!c) return res.status(404).json({ success: false, message: 'Case not found' });

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const reporterEmail = c.reporter_email;
    const policeEmail   = c.police_email;

    // ── Emit real-time socket alert to ALL connected devices ──
    const io = req.app.get('io');
    if (io) {
      io.emit('face_match', {
        caseId:       c._id,
        report_number: c.report_number,
        full_name:    c.full_name,
        age:          c.age,
        gender:       c.gender,
        matchScore:   matchScore,
        location:     location,
        timestamp:    timestamp,
        photo:        c.photo,
        reporter_name:  c.reporter_name,
        reporter_phone: c.reporter_phone
      });
    }

    // ── Send email if nodemailer is configured ──
    const emailsSent = [];
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = getTransporter();
      const recipients = [reporterEmail, policeEmail].filter(Boolean);

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;background:#030508;color:#ddeeff;padding:30px;border-radius:12px;max-width:600px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#ff3f5c;font-size:28px;margin:0">🚨 FACE MATCH ALERT</h1>
            <p style="color:#6a98b8;margin:4px 0 0">TraceBack Intelligence System</p>
          </div>

          <div style="background:#0d1828;border-radius:10px;padding:20px;margin-bottom:16px;border-left:4px solid #ff3f5c">
            <h2 style="color:#ffb020;margin:0 0 12px">Possible Match Detected!</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#6a98b8;padding:4px 0;width:140px">Case Number</td><td style="color:#1a90f5;font-weight:bold">${c.report_number}</td></tr>
              <tr><td style="color:#6a98b8;padding:4px 0">Missing Person</td><td style="color:#ddeeff;font-weight:bold">${c.full_name}</td></tr>
              <tr><td style="color:#6a98b8;padding:4px 0">Age / Gender</td><td style="color:#ddeeff">${c.age || '—'} / ${c.gender || '—'}</td></tr>
              <tr><td style="color:#6a98b8;padding:4px 0">Match Score</td><td style="color:#00e0a0;font-weight:bold">${Math.round(matchScore * 100)}% confidence</td></tr>
              <tr><td style="color:#6a98b8;padding:4px 0">Detected At</td><td style="color:#ddeeff">${location || 'Unknown location'}</td></tr>
              <tr><td style="color:#6a98b8;padding:4px 0">Date & Time</td><td style="color:#ddeeff">${timestamp}</td></tr>
            </table>
          </div>

          ${snapshotBase64 ? `
          <div style="margin-bottom:16px">
            <p style="color:#6a98b8;margin:0 0 8px;font-size:13px">CAPTURED SNAPSHOT</p>
            <img src="${snapshotBase64}" style="width:100%;border-radius:8px;border:2px solid #1a90f5" />
          </div>` : ''}

          <div style="background:#0d1828;border-radius:10px;padding:16px;margin-bottom:16px">
            <p style="color:#6a98b8;margin:0 0 6px;font-size:12px;text-transform:uppercase">REPORTER / FAMILY CONTACT</p>
            <p style="color:#ddeeff;margin:0">${c.reporter_name || '—'}</p>
            <p style="color:#1a90f5;margin:0">${c.reporter_phone || '—'}</p>
          </div>

          <div style="text-align:center;background:#ff3f5c22;border:1px solid #ff3f5c44;border-radius:8px;padding:16px">
            <p style="color:#ff3f5c;margin:0;font-weight:bold">⚠️ PLEASE VERIFY AND CONTACT POLICE IMMEDIATELY</p>
            <p style="color:#6a98b8;margin:4px 0 0;font-size:13px">Do NOT approach the individual alone. Contact your nearest police station.</p>
          </div>

          <p style="color:#2e5070;font-size:12px;text-align:center;margin-top:20px">
            Sent by TraceBack Face Scan System · ${timestamp}
          </p>
        </div>
      `;

      for (const email of recipients) {
        try {
          await transporter.sendMail({
            from: `TraceBack Alert <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `🚨 FACE MATCH: ${c.full_name} — Case ${c.report_number}`,
            html: htmlBody
          });
          emailsSent.push(email);
        } catch (mailErr) {
          console.error('Email send failed to', email, ':', mailErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Alert dispatched',
      emailsSent,
      socketEmitted: !!io
    });

  } catch (err) {
    console.error('facescan/alert error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/facescan/cases-with-photos
// Returns only missing cases that have photos (for face matching)
router.get('/cases-with-photos', async (req, res) => {
  try {
    const cases = await Case.find({
      status: { $in: ['missing', 'investigating'] },
      photo: { $exists: true, $ne: '' }
    }, 'full_name age gender report_number photo reporter_name reporter_phone').lean();
    res.json({ success: true, data: cases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
