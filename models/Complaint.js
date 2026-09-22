const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // Anonymous — no user ID stored intentionally
  complaint_number: { type: String, unique: true },

  category: {
    type: String,
    enum: ['pocso', 'abuse', 'domestic_violence', 'trafficking', 'harassment', 'other'],
    required: true
  },

  victim_age:    Number,
  victim_gender: String,
  victim_description: String,   // no name required

  suspect_name:        String,
  suspect_description: String,
  suspect_location:    String,
  suspect_phone:       String,

  incident_date:     String,
  incident_location: String,
  incident_details:  { type: String, required: true },

  evidence_description: String,  // describe evidence, no file upload for privacy

  // Contact (optional — for follow-up only, kept confidential)
  contact_email: String,  // if they want updates
  contact_phone: String,

  status: {
    type: String,
    enum: ['received', 'under_review', 'forwarded_to_authorities', 'closed'],
    default: 'received'
  },

  priority:   { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
  admin_notes: String,
  forwarded_to: String,  // which authority it was sent to

  // IP hash for abuse prevention (not stored raw)
  ip_hash: String,

}, { timestamps: { createdAt: 'filed_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Complaint', complaintSchema);
