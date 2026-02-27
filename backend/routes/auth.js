
import express from 'express';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/email.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ error: 'Missing email or token' });
    }

    const user = await User.findOne({ email, verificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification link or token' });
    }
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < Date.now()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    return res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('[ERROR] Email verification failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
      if (!existingUser.emailVerified) {
        // Resend verification email
        try {
          // Generate new token and expiry
          existingUser.verificationToken = crypto.randomBytes(32).toString('hex');
          existingUser.verificationTokenExpiry = Date.now() + 15 * 60 * 1000;
          await existingUser.save();
          const { sendEmailVerificationEmail } = await import('../utils/email.js');
          await sendEmailVerificationEmail(existingUser.email, existingUser.verificationToken);
          console.log('[DEBUG Backend] Re-sent verification email to unverified user:', existingUser.email);
        } catch (err) {
          console.error('[ERROR] Failed to resend verification email:', err);
        }
        return res.status(423).json({ error: 'Email registered but not verified', resend: true });
      }
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

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
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    await user.save();

    // Send verification email
    try {
      const { sendEmailVerificationEmail } = await import('../utils/email.js');
      await sendEmailVerificationEmail(user.email, verificationToken);
      console.log('[DEBUG Backend] Verification email sent:', user.email);
    } catch (err) {
      console.error('[ERROR] Failed to send verification email:', err);
    }

    console.log('[DEBUG Backend] User registered:', userId, { email: normEmail, name, age });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
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

    // Block login if email not verified
    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
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
      console.error('[DEBUG] Missing fields:', { googleToken: !!googleToken, email, name });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify Google token (optional - frontend already verified it)
    let googleId;
    try {
      console.log('[DEBUG] Attempting to decode Google token');
      const decoded = jwtDecode(googleToken);
      console.log('[DEBUG] Decoded token:', { sub: decoded.sub, email: decoded.email, exp: decoded.exp });
      googleId = decoded.sub; // Google's unique ID
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.error('[DEBUG] Google token expired at:', new Date(decoded.exp * 1000));
        return res.status(401).json({ error: 'Google token expired' });
      }
    } catch (err) {
      console.error('[DEBUG] Token decode error:', err.message);
      return res.status(401).json({ error: 'Invalid Google token: ' + err.message });
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
    
    // Convert GeoJSON coordinates to simple format for frontend
    const userData = user.toObject();
    if (userData.coordinates && userData.coordinates.coordinates) {
      const [lon, lat] = userData.coordinates.coordinates;
      userData.coordinates = { longitude: lon, latitude: lat };
    }
    
    res.json(userData);
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

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      console.log('[DEBUG] Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('[ERROR] Failed to send password reset email:', emailError);
      // Don't fail the request if email fails - just log it for admin review
      // This prevents revealing email sending issues to potential attackers
    }

    res.json({
      message: 'Password reset requested. Check your email for instructions.'
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
