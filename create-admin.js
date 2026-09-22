/**
 * TraceBack — Create admin account
 * Run: node create-admin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('ℹ️  Admin already exists:', existing.email);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name:          'TraceBack Admin',
    email:         process.env.ADMIN_EMAIL || 'admin@traceback.local',
    password:      process.env.ADMIN_PASS  || 'Admin@123456',
    role:          'admin',
    emailVerified: true
  });

  console.log('✅ Admin account created!');
  console.log('   Email:   ', admin.email);
  console.log('   Password:', process.env.ADMIN_PASS || 'Admin@123456');
  console.log('   ⚠️  Change password after first login!');
  await mongoose.disconnect();
}

createAdmin().catch(e => { console.error('❌', e.message); process.exit(1); });
