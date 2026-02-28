const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const DailyStat = require('../models/DailyStat');

// GET /api/reports/summary
router.get('/summary', async (_req, res) => {
  const totalAlerts = await Alert.countDocuments();
  const resolvedIncidents = await Incident.countDocuments({ status: 'Resolved' });
  const pendingIncidents = await Incident.countDocuments({ status: 'Pending' });
  const unresolvedIncidents = await Incident.countDocuments({ status: 'Unresolved' });
  res.json({ totalAlerts, resolvedIncidents, pendingIncidents, unresolvedIncidents });
});

// GET /api/reports/daily
router.get('/daily', async (_req, res) => {
  const rows = await DailyStat.find().sort({ date: -1 });
  res.json(rows);
});

// POST /api/reports/daily
router.post('/daily', async (req, res) => {
  const { date, total_alerts, resolved } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  const stat = await DailyStat.findOneAndUpdate(
    { date },
    { totalAlerts: total_alerts || 0, resolved: resolved || 0 },
    { upsert: true, new: true }
  );
  res.json(stat);
});

module.exports = router;
