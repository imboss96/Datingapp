import express from 'express';
import EmailVerification from '../models/EmailVerification.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Request OTP for email verification (public)
router.post('/register-verify', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await EmailVerification.findOneAndUpdate(
      { email },
      { otp, expiresAt, attempts: 0, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // send email (async)
    sendEmail(email, 'Your verification code', `Your verification code is ${otp}. It expires in 10 minutes.`).catch(err => console.error('Email send failed', err));

    res.json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
});

// Verify OTP
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const record = await EmailVerification.findOne({ email });
    if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });

    if (record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ email });
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (record.otp !== otp) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark user as verified if user exists
    await User.updateOne({ email }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
    await EmailVerification.deleteOne({ email });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Endpoint for moderators/admins to query OTP records (optional)
router.get('/records', authMiddleware, async (req, res, next) => {
  try {
    // only allow moderators/admins
    if (!['ADMIN', 'MODERATOR'].includes(req.userRole)) return res.status(403).json({ error: 'Forbidden' });
    const records = await EmailVerification.find().sort({ createdAt: -1 }).limit(200);
    res.json(records);
  } catch (err) { next(err); }
});

// Development helper: return OTP for an email (ONLY in development)
router.get('/dev/otp', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development') return res.status(403).json({ error: 'Not allowed' });
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query required' });
    const record = await EmailVerification.findOne({ email: String(email).toLowerCase() });
    if (!record) return res.status(404).json({ error: 'No OTP record' });
    res.json({ email: record.email, otp: record.otp, expiresAt: record.expiresAt });
  } catch (err) { next(err); }
});

export default router;
