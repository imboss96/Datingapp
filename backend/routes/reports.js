import express from 'express';
import Report from '../models/Report.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create report
router.post('/', async (req, res) => {
  try {
    const { reportedId, reason, type, targetId } = req.body;

    if (!reportedId || !reason || !type || !targetId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = new Report({
      id: uuidv4(),
      reportedId,
      reporterId: req.userId,
      reason,
      type,
      targetId,
      status: 'PENDING',
    });

    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all reports (admin only)
router.get('/', async (req, res) => {
  try {
    // You might want to add role check here
    const reports = await Report.find();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update report status
router.put('/:reportId', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const report = await Report.findOneAndUpdate(
      { id: req.params.reportId },
      { status, notes, updatedAt: new Date() },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
