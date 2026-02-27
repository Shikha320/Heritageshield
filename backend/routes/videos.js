const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const Video = require('../models/Video');
const Alert = require('../models/Alert');

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (_req, file, cb) => cb(null, `${uid()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

// GET /api/videos
router.get('/', async (_req, res) => {
  const rows = await Video.find().sort({ createdAt: -1 });
  res.json(rows);
});

// POST /api/videos
router.post('/', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file provided' });
  const vid = await Video.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
  res.status(201).json(vid);
});

// DELETE /api/videos/:id
router.delete('/:id', async (req, res) => {
  const row = await Video.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Video not found' });
  const filePath = path.join(__dirname, '..', 'uploads', row.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await Video.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// POST /api/videos/analyze/:id — run YOLOv8 analysis on uploaded video
router.post('/analyze/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const videoPath = path.join(__dirname, '..', 'uploads', video.filename);
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video file missing from disk' });

    // Find the Python executable (prefer venv)
    const venvPython = path.join(__dirname, '..', '..', '..', '.venv', 'Scripts', 'python.exe');
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python';
    const scriptPath = path.join(__dirname, '..', 'analyze_video.py');

    // Run the analysis script
    await Video.findByIdAndUpdate(req.params.id, { status: 'analyzing' });

    execFile(
      pythonCmd,
      [scriptPath, videoPath, '--interval', '30', '--conf', '0.45'],
      { maxBuffer: 50 * 1024 * 1024, timeout: 300000 },
      async (error, stdout, stderr) => {
        if (error) {
          await Video.findByIdAndUpdate(req.params.id, { status: 'error' });
          console.error('Analysis error:', stderr || error.message);
          return res.status(500).json({ error: 'Analysis failed', details: stderr || error.message });
        }

        try {
          // Extract the JSON portion — ultralytics may print extra text before it
          let jsonStr = stdout.trim();
          const jsonStart = jsonStr.indexOf('{');
          if (jsonStart > 0) jsonStr = jsonStr.slice(jsonStart);
          const result = JSON.parse(jsonStr);

          if (result.error) {
            await Video.findByIdAndUpdate(req.params.id, { status: 'error' });
            return res.status(500).json({ error: result.error });
          }

          // Save alerts to database
          const savedAlerts = [];
          for (const a of (result.alerts || [])) {
            const alert = await Alert.create({
              type: a.type,
              message: a.message,
              camera: `Video: ${video.originalName}`,
              severity: a.severity,
              resolved: false,
            });
            savedAlerts.push(alert);
          }

          await Video.findByIdAndUpdate(req.params.id, { status: 'analyzed' });

          res.json({
            videoId: video._id,
            totalFrames: result.totalFrames,
            analyzedFrames: result.analyzedFrames,
            fps: result.fps,
            summary: result.summary,
            detections: result.detections,
            alerts: savedAlerts,
          });
        } catch (parseErr) {
          console.error('Parse error. stdout:', stdout.slice(0, 500));
          console.error('stderr:', stderr);
          await Video.findByIdAndUpdate(req.params.id, { status: 'error' });
          res.status(500).json({ error: 'Failed to parse analysis output', details: stdout.slice(0, 300) });
        }
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err) return res.status(400).json({ error: err.message });
});

module.exports = router;
