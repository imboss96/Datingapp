import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, age, location } = req.body;

    if (!email || !password || !name || !age) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize email to avoid case-sensitive duplicates
    const normEmail = String(email).toLowerCase();

    const existingUser = await User.findOne({ email: normEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const user = new User({
      id: userId,
      email: normEmail,
      passwordHash,
      name,
      age,
      location: location || 'Not specified',
      interests: [],
      coins: 10,
      isPremium: false,
      role: 'USER',
    });

    await user.save();

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    // Set httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('[DEBUG Backend] User registered:', userId, { email: normEmail, name, age });

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        images: user.images || [],
        coins: user.coins,
        termsOfServiceAccepted: user.termsOfServiceAccepted || false,
        privacyPolicyAccepted: user.privacyPolicyAccepted || false,
        cookiePolicyAccepted: user.cookiePolicyAccepted || false,
      },
    });
  } catch (err) {
    // Handle duplicate key error as conflict
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normEmail = String(email).toLowerCase();

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    // Set httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('[DEBUG Backend] Login successful for user:', user.id, { age: user.age, location: user.location, interests: user.interests });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        images: user.images || [],
        coins: user.coins,
        termsOfServiceAccepted: user.termsOfServiceAccepted || false,
        privacyPolicyAccepted: user.privacyPolicyAccepted || false,
        cookiePolicyAccepted: user.cookiePolicyAccepted || false,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sign-In/Sign-Up
router.post('/google', async (req, res) => {
  try {
    const { googleToken, email, name, profilePicture } = req.body;

    if (!googleToken || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify Google token (optional - frontend already verified it)
    let googleId;
    try {
      const decoded = jwtDecode(googleToken);
      googleId = decoded.sub; // Google's unique ID
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    // Normalize email for consistency and check if user exists by email or Google ID
    const normEmail = String(email).toLowerCase();

    let user = await User.findOne({ $or: [{ email: normEmail }, { googleId }] });

    if (!user) {
      // Create new user
      const userId = uuidv4();
      user = new User({
        id: userId,
        email: normEmail,
        googleId,
        name,
        age: 25, // Default age for Google sign-up
        location: 'Not specified',
        profilePicture,
        interests: [],
        coins: 10,
        isPremium: false,
        role: 'USER',
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google account to existing email user
      user.googleId = googleId;
      if (profilePicture && !user.profilePicture) {
        user.profilePicture = profilePicture;
      }
      await user.save();
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    // Set httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('[DEBUG Backend] Google auth successful for user:', user.id, { age: user.age, location: user.location, interests: user.interests, isNewUser: !user.googleId });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        images: user.images || [],
        coins: user.coins,
        termsOfServiceAccepted: user.termsOfServiceAccepted || false,
        privacyPolicyAccepted: user.privacyPolicyAccepted || false,
        cookiePolicyAccepted: user.cookiePolicyAccepted || false,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user based on token
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.userId }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request Password Reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: normEmail });

    if (!user) {
      // Don't reveal if email exists for security reasons
      return res.json({ message: 'If email exists, a reset link will be sent' });
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // In production, you would send this via email
    // For now, we'll return it to the client (in real app, don't do this)
    console.log('[DEBUG] Password reset token generated for:', email, 'Token:', resetToken);

    res.json({
      message: 'Password reset requested. Check your email for instructions.',
      resetToken, // ONLY FOR DEMO - remove in production
      expiry: resetTokenExpiry
    });
  } catch (err) {
    console.error('[ERROR] Password reset request failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset Password with Token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: normEmail });

    if (!user || !user.resetToken) {
      return res.status(401).json({ error: 'Invalid reset request' });
    }

    // Check if token matches and hasn't expired
    if (user.resetToken !== resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
      return res.status(401).json({ error: 'Reset token is invalid or expired' });
    }

    // Hash new password and update user
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    console.log('[DEBUG] Password reset successfully for user:', user.id);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('[ERROR] Password reset failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Change Password (for authenticated users)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ id: userId });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Cannot change password for this account' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and set new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await user.save();

    console.log('[DEBUG] Password changed successfully for user:', userId);

    res.json({ message: 'Password has been changed successfully' });
  } catch (err) {
    console.error('[ERROR] Change password failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Logout - Clear authentication cookie
router.post('/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Logged out successfully' });
});

export default router;
