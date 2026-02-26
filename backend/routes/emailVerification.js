import express from 'express';
import EmailVerification from '../models/EmailVerification.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ...existing code...

// ...existing code...

export default router;
