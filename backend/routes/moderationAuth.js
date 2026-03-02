import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import ModeratorEarnings from '../models/ModeratorEarnings.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';

/**
 * @route POST /api/moderation-auth/login
 * @desc Login for both APP users (existing) and STANDALONE users
 * @param {string} username - Username or email
 * @param {string} password - Password
 * @returns {object} { token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if account is suspended or banned FIRST (before password check)
    if (user.suspended) {
      console.log('[ERROR] Login blocked - user suspended:', user.id);
      return res.status(403).json({
        error: 'Account Suspended',
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended by our moderation team.',
        reason: user.suspendedReason || 'Violation of community guidelines',
        suspendedAt: user.suspendedAt,
        supportMessage: 'If you believe this is a mistake, please contact our support team at support@lunesa.com',
        contactEmail: 'support@lunesa.com',
        showSuspensionPage: true
      });
    }

    if (user.banned) {
      console.log('[ERROR] Login blocked - user banned:', user.id);
      return res.status(403).json({
        error: 'Account Banned',
        code: 'ACCOUNT_BANNED',
        message: 'Your account has been permanently banned from our platform.',
        reason: user.bannedReason || 'Serious violation of community guidelines',
        bannedAt: user.bannedAt,
        supportMessage: 'For more information, please contact our support team at support@lunesa.com',
        contactEmail: 'support@lunesa.com',
        showSuspensionPage: true
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if account is banned
    if (user.banned) {
      console.log('[DEBUG] Login blocked - user banned:', user.id);
      return res.status(403).json({
        error: 'Account Banned',
        code: 'ACCOUNT_BANNED',
        message: 'Your account has been permanently banned from our platform.',
        reason: user.bannedReason || 'Serious violation of community guidelines',
        bannedAt: user.bannedAt,
        supportMessage: 'For more information, please contact our support team at support@lunesa.com',
        contactEmail: 'support@lunesa.com',
        showSuspensionPage: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        accountType: user.accountType || 'APP', // APP or STANDALONE
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Return user data (without sensitive info)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.profilePicture || user.images?.[0],
      role: user.role,
      accountType: user.accountType || 'APP',
      coins: user.coins || 0
    };

    res.json({
      token,
      user: userResponse,
      accountType: user.accountType || 'APP'
    });
  } catch (err) {
    console.error('[ERROR] Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route POST /api/moderation-auth/register
 * @desc Register new STANDALONE user
 * @param {string} email - Email address
 * @param {string} username - Username (must be unique)
 * @param {string} password - Password
 * @param {string} passwordConfirmation - Password confirmation
 * @param {string} name - Full name
 * @returns {object} { message, user }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, passwordConfirmation, name } = req.body;

    // Validation
    if (!email || !username || !password || !passwordConfirmation || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== passwordConfirmation) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username.toLowerCase()) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      id: uuidv4(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      name,
      age: 0, // Required field, default to 0 for external users
      accountType: 'STANDALONE', // Mark as standalone/external user
      role: 'MODERATOR', // Set as MODERATOR so they appear in operators tab
      coins: 0,
      emailVerified: true, // Auto-verify for standalone users
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    // Create ModeratorEarnings record for new user
    const earnings = new ModeratorEarnings({
      moderatorId: newUser.id,
      sessionEarnings: 0,
      totalEarnings: 0,
      dailyEarnings: [],
      lastResetAt: new Date(),
      replyRate: 0
    });
    await earnings.save();

    // Log signup
    const { logSignup } = await import('../utils/activityLogger.js');
    await logSignup(newUser.id, email.toLowerCase(), 'STANDALONE', { headers: req.headers || {} });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        accountType: 'STANDALONE',
        role: 'MODERATOR'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      accountType: 'STANDALONE',
      role: 'MODERATOR'
    };

    res.status(201).json({
      message: 'Account created successfully',
      user: userResponse,
      token,
      accountType: 'STANDALONE'
    });
  } catch (err) {
    console.error('[ERROR] Registration failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route POST /api/moderation-auth/verify-token
 * @desc Verify JWT token and return user info
 * @param {string} token - JWT token
 * @returns {object} { valid, user }
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data
    const user = await User.findOne({ id: decoded.id });

    if (!user) {
      return res.status(401).json({ valid: false, error: 'User not found' });
    }

    if (user.suspended || user.banned) {
      return res.status(403).json({ valid: false, error: 'Account is suspended or banned' });
    }

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.profilePicture || user.images?.[0],
      role: user.role,
      accountType: user.accountType || 'APP',
      coins: user.coins || 0
    };

    res.json({
      valid: true,
      user: userResponse,
      accountType: user.accountType || 'APP'
    });
  } catch (err) {
    console.error('[ERROR] Token verification failed:', err);
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

export default router;
