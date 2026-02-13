import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.userId }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for swiping)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash -email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    console.log('[DEBUG Backend] PUT /users/:userId - req.userId:', req.userId, 'params.userId:', req.params.userId);
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, age, bio, location, interests, images } = req.body;
    console.log('[DEBUG Backend] Updating user profile with:', { name, age, bio, location, interests, images });
    const user = await User.findOneAndUpdate(
      { id: req.params.userId },
      { name, age, bio, location, interests, images, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');

    console.log('[DEBUG Backend] User profile updated:', { id: user.id, age: user.age, location: user.location, interests: user.interests });
    res.json(user);
  } catch (err) {
    console.error('[DEBUG Backend] Error updating profile:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Record swipe action
router.post('/:userId/swipe', async (req, res) => {
  try {
    const { targetUserId, action } = req.body; // action: 'pass', 'like', 'superlike'

    const currentUser = await User.findOne({ id: req.params.userId });
    const targetUser = await User.findOne({ id: targetUserId });

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already swiped
    if (currentUser.swipes.includes(targetUserId)) {
      return res.status(400).json({ error: 'Already swiped' });
    }

    currentUser.swipes.push(targetUserId);
    await currentUser.save();

    // Check for mutual like (match)
    if ((action === 'like' || action === 'superlike') && targetUser.swipes.includes(req.params.userId)) {
      // It's a match!
      if (!currentUser.matches.includes(targetUserId)) {
        currentUser.matches.push(targetUserId);
        targetUser.matches.push(req.params.userId);
        await currentUser.save();
        await targetUser.save();
      }
      return res.json({ matched: true, message: 'You have a match!' });
    }

    res.json({ matched: false, message: 'Swipe recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deduct coins
router.post('/:userId/deduct-coin', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.coins <= 0) {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    user.coins -= 1;
    await user.save();

    res.json({ coins: user.coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
