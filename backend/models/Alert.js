const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:     { type: String, default: 'motion' },
  message:  { type: String, required: true },
  camera:   { type: String, default: null },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
