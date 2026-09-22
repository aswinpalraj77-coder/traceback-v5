const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
}

async function sendOTPEmail(to, otp, name) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return false;
  try {
    await getTransporter().sendMail({
      from: `TraceBack Security <${process.env.GMAIL_USER}>`,
      to,
      subject: `TraceBack — Your OTP: ${otp}`,
      html: `<div style="font-family:Arial,sans-serif;background:#030508;color:#ddeeff;padding:30px;border-radius:12px;max-width:500px">
        <h2 style="color:#1a90f5">TraceBack Verification</h2>
        <p>Hi ${name}, your one-time code is:</p>
        <div style="background:#0d1828;border:2px solid #1a90f5;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
          <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#00d9ff;font-family:monospace">${otp}</span>
        </div>
        <p style="color:#6a98b8;font-size:13px">Expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>`
    });
    return true;
  } catch (e) { console.error('OTP email failed:', e.message); return false; }
}

async function sendAlertEmail(recipients, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return [];
  const t = getTransporter();
  const sent = [];
  for (const to of recipients.filter(Boolean)) {
    try { await t.sendMail({ from: `TraceBack Alert <${process.env.GMAIL_USER}>`, to, subject, html }); sent.push(to); }
    catch (e) { console.error('Email to', to, 'failed:', e.message); }
  }
  return sent;
}

module.exports = { sendOTPEmail, sendAlertEmail };
