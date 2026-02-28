const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');

// GET /api/incidents
router.get('/', async (_req, res) => {
  const rows = await Incident.find().sort({ createdAt: -1 });
  res.json(rows);
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  const row = await Incident.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Incident not found' });
  res.json(row);
});

// POST /api/incidents
router.post('/', async (req, res) => {
  const { camera, description, status } = req.body;
  if (!camera) return res.status(400).json({ error: 'camera is required' });
  const incidentId = 'INC' + String(Date.now()).slice(-6);
  const inc = await Incident.create({ incidentId, camera, description: description || '', status: status || 'Pending' });
  res.status(201).json(inc);
});

// PATCH /api/incidents/:id
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  const updated = await Incident.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Incident not found' });
  res.json(updated);
});

// DELETE /api/incidents/:id
router.delete('/:id', async (req, res) => {
  const deleted = await Incident.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Incident not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
