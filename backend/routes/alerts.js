const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

// GET /api/alerts
router.get('/', async (_req, res) => {
  const rows = await Alert.find().sort({ createdAt: -1 });
  res.json(rows);
});

// GET /api/alerts/active
router.get('/active', async (_req, res) => {
  const rows = await Alert.find({ resolved: false }).sort({ createdAt: -1 });
  res.json(rows);
});

// GET /api/alerts/summary
router.get('/summary', async (_req, res) => {
  const total = await Alert.countDocuments();
  const active = await Alert.countDocuments({ resolved: false });
  res.json({ total, active, resolved: total - active });
});

// POST /api/alerts
router.post('/', async (req, res) => {
  const { type, message, camera, severity, location, image } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  const alert = await Alert.create({
    type: type || 'motion',
    message,
    camera: camera || null,
    location: location || null,
    image: image || null,
    severity: severity || 'medium'
  });
  res.status(201).json(alert);
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  const updated = await Alert.findByIdAndUpdate(req.params.id, { resolved: true }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Alert not found' });
  res.json(updated);
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  const deleted = await Alert.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Alert not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
