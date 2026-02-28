const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true },
  camera:     { type: String, required: true },
  description:{ type: String, default: '' },
  status:     { type: String, enum: ['Pending', 'Resolved', 'Unresolved'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
