import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Check if username is available (NO AUTH REQUIRED - must be before authMiddleware)
router.post('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.query.userId; // Optional: pass current userId to exclude from check

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    if (existingUser && existingUser.id !== currentUserId) {
      return res.json({ available: false, message: 'Username already taken' });
    }

    res.json({ available: true, message: 'Username is available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply authentication middleware to remaining routes
router.use(authMiddleware);

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

    const { name, age, bio, location, interests, images, username } = req.body;
    console.log('[DEBUG Backend] Updating user profile with:', { name, age, bio, location, interests, images, username });
    
    // If username is being updated, check if it's available
    if (username) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        id: { $ne: req.params.userId }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updateData = { name, age, bio, location, interests, images, updatedAt: new Date() };
    if (username) {
      updateData.username = username.toLowerCase();
    }

    const user = await User.findOneAndUpdate(
      { id: req.params.userId },
      updateData,
      { new: true }
    ).select('-passwordHash');

    console.log('[DEBUG Backend] User profile updated:', { id: user.id, age: user.age, location: user.location, interests: user.interests, username: user.username });
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

    // Calculate interest match percentage
    const calculateInterestMatch = (user1, user2) => {
      if (!user1.interests || !user2.interests || user1.interests.length === 0) {
        return 0;
      }
      const commonInterests = user1.interests.filter(interest => 
        user2.interests.includes(interest)
      ).length;
      const totalUniqueInterests = new Set([...user1.interests, ...user2.interests]).size;
      return Math.round((commonInterests / totalUniqueInterests) * 100);
    };

    const interestMatch = calculateInterestMatch(currentUser, targetUser);
    console.log(`[DEBUG] Swipe from ${req.params.userId} to ${targetUserId}. Interest match: ${interestMatch}%`);

    // Check for mutual like (match) - both must like each other AND have 70%+ interest match
    if ((action === 'like' || action === 'superlike') && targetUser.swipes.includes(req.params.userId) && interestMatch >= 70) {
      // It's a match!
      if (!currentUser.matches.includes(targetUserId)) {
        currentUser.matches.push(targetUserId);
        targetUser.matches.push(req.params.userId);
        await currentUser.save();
        await targetUser.save();
        console.log(`[DEBUG] Match created between ${req.params.userId} and ${targetUserId} with ${interestMatch}% interest match`);
      }
      return res.json({ 
        matched: true, 
        message: `You have a match with ${interestMatch}% interest compatibility!`,
        interestMatch,
        matchedUser: {
          id: targetUser.id,
          name: targetUser.name,
          profilePicture: targetUser.profilePicture,
          location: targetUser.location,
          interests: targetUser.interests,
        }
      });
    }

    res.json({ 
      matched: false, 
      message: 'Swipe recorded',
      interestMatch,
      note: interestMatch < 70 ? `${interestMatch}% interest match (need 70%+ to match)` : 'Waiting for mutual like...'
    });
  } catch (err) {
    console.error('[ERROR] Swipe error:', err);
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

// Update notification settings
router.put('/:userId/notifications', async (req, res) => {
  try {
    console.log('[DEBUG Backend] PUT /users/:userId/notifications - req.userId:', req.userId, 'params.userId:', req.params.userId);
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { newMatches, newMessages, activityUpdates, promotions } = req.body;
    console.log('[DEBUG Backend] Updating notification settings with:', { newMatches, newMessages, activityUpdates, promotions });
    
    const user = await User.findOneAndUpdate(
      { id: req.params.userId },
      { 
        notifications: {
          newMatches,
          newMessages,
          activityUpdates,
          promotions
        },
        updatedAt: new Date()
      },
      { new: true }
    ).select('-passwordHash');

    console.log('[DEBUG Backend] Notification settings updated:', user.notifications);
    res.json({ message: 'Notification settings updated', notifications: user.notifications });
  } catch (err) {
    console.error('[DEBUG Backend] Error updating notification settings:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
