import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    console.log('[DEBUG Backend] User registered:', userId, { email: normEmail, name, age });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        coins: user.coins,
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

    console.log('[DEBUG Backend] Login successful for user:', user.id, { age: user.age, location: user.location, interests: user.interests });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        coins: user.coins,
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

    console.log('[DEBUG Backend] Google auth successful for user:', user.id, { age: user.age, location: user.location, interests: user.interests, isNewUser: !user.googleId });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        location: user.location,
        interests: user.interests || [],
        profilePicture: user.profilePicture,
        coins: user.coins,
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

export default router;
