const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema({
  date:        { type: String, required: true, unique: true },
  totalAlerts: { type: Number, default: 0 },
  resolved:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
