const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  size:         { type: Number, required: true },
  mimetype:     { type: String, required: true },
  status:       { type: String, default: 'uploaded' },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
