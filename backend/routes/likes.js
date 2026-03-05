import express from 'express';
import Like from '../models/Like.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// DEBUG: Get debug info - shows all likes for testing (REMOVE IN PRODUCTION)
router.get('/debug/all-likes', async (req, res) => {
  try {
    const allLikes = await Like.find({}).limit(50).sort({ createdAt: -1 });
    const totalCount = await Like.countDocuments();
    console.log(`[DEBUG] Total likes in database: ${totalCount}`);
    res.json({
      totalLikes: totalCount,
      recentLikes: allLikes,
      message: 'DEBUG ENDPOINT - This shows recent likes for testing only'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a like or superlike
// POST /api/likes with body { profileUserId, likeType: 'like' | 'superlike' }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { profileUserId, likeType = 'like' } = req.body;
    const likerUserId = req.userId;

    if (!profileUserId) {
      return res.status(400).json({ error: 'profileUserId is required' });
    }

    if (likerUserId === profileUserId) {
      return res.status(400).json({ error: 'Cannot like your own profile' });
    }

    // Check if like already exists
    const existingLike = await Like.findOne({ 
      profileUserId, 
      likerUserId 
    });

    if (existingLike) {
      // Update the like type (e.g., from 'like' to 'superlike')
      if (existingLike.likeType !== likeType) {
        existingLike.likeType = likeType;
        await existingLike.save();
        console.log(`[Like] Updated ${likerUserId} ${likeType}d ${profileUserId}`);
        return res.json({ 
          created: false, 
          updated: true, 
          like: existingLike 
        });
      }
      // Like already exists with same type
      return res.status(400).json({ error: 'Already liked this profile' });
    }

    // Create new like record
    const like = new Like({
      id: uuidv4(),
      profileUserId,
      likerUserId,
      likeType
    });

    await like.save();
    console.log(`[Like] ${likerUserId} ${likeType}d ${profileUserId}`);
    
    res.status(201).json({ 
      created: true, 
      updated: false, 
      like 
    });
  } catch (err) {
    console.error('[ERROR] Recording like failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get like statistics for a profile
// GET /api/likes/:profileUserId/stats
router.get('/:profileUserId/stats', async (req, res) => {
  try {
    const { profileUserId } = req.params;
    console.log(`[Likes API] Fetching stats for profile: ${profileUserId}`);

    // Count total likes
    const totalLikes = await Like.countDocuments({ 
      profileUserId,
      likeType: 'like'
    });

    // Count total superlikes
    const totalSuperLikes = await Like.countDocuments({ 
      profileUserId,
      likeType: 'superlike'
    });

    console.log(`[Likes API] Stats for ${profileUserId}: ${totalLikes} likes, ${totalSuperLikes} superlikes`);

    // Get recent likers (last 10)
    const recentLikers = await Like.find({ profileUserId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('likerUserId likeType createdAt');

    res.json({
      profileUserId,
      totalLikes,
      totalSuperLikes,
      totalInteractions: totalLikes + totalSuperLikes,
      recentLikers
    });
  } catch (err) {
    console.error('[ERROR] Getting like stats failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if user has liked a profile
// GET /api/likes/:profileUserId/check?likerUserId=xxx
router.get('/:profileUserId/check', authMiddleware, async (req, res) => {
  try {
    const { profileUserId } = req.params;
    const likerUserId = req.userId;

    const like = await Like.findOne({ profileUserId, likerUserId });

    res.json({
      hasLiked: !!like,
      likeType: like?.likeType || null
    });
  } catch (err) {
    console.error('[ERROR] Checking like failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all likes given by a user
// GET /api/likes/given/user
router.get('/given/user', authMiddleware, async (req, res) => {
  try {
    const likerUserId = req.userId;

    const likes = await Like.find({ likerUserId })
      .sort({ createdAt: -1 })
      .select('profileUserId likeType createdAt');

    res.json({
      likerUserId,
      totalGiven: likes.length,
      likes
    });
  } catch (err) {
    console.error('[ERROR] Getting user likes failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get full user profiles for all users that the current user has liked
// GET /api/likes/given/user/profiles
router.get('/given/user/profiles', authMiddleware, async (req, res) => {
  try {
    const likerUserId = req.userId;
    const { limit = 20, skip = 0 } = req.query;

    // Get likes given by current user
    const likes = await Like.find({ likerUserId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    if (likes.length === 0) {
      return res.json({
        likerUserId,
        totalLiked: 0,
        users: []
      });
    }

    // Get the profileUserIds
    const profileUserIds = likes.map(like => like.profileUserId);

    // Import User model dynamically to avoid issues
    const { default: User } = await import('../models/User.js');

    // Fetch full user profiles
    const projection = '-passwordHash -email -googleId -facebookId -tiktokId';
    const users = await User.find({ id: { $in: profileUserIds } })
      .select(projection);

    // Sort by likes order (most recent first)
    const userMap = new Map(users.map(u => [u.id, u]));
    const orderedUsers = profileUserIds
      .map(id => userMap.get(id))
      .filter(Boolean);

    // Attach likeType to each user
    const likesMap = new Map(likes.map(l => [l.profileUserId, l.likeType]));
    const usersWithLikeType = orderedUsers.map(user => ({
      ...user.toObject(),
      likeType: likesMap.get(user.id) || 'like'
    }));

    res.json({
      likerUserId,
      totalLiked: await Like.countDocuments({ likerUserId }),
      users: usersWithLikeType
    });
  } catch (err) {
    console.error('[ERROR] Getting liked user profiles failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all likes received by a user
// GET /api/likes/received/user
router.get('/received/user', authMiddleware, async (req, res) => {
  try {
    const profileUserId = req.userId;

    const likes = await Like.find({ profileUserId })
      .sort({ createdAt: -1 })
      .select('likerUserId likeType createdAt');

    res.json({
      profileUserId,
      totalReceived: likes.length,
      likes
    });
  } catch (err) {
    console.error('[ERROR] Getting received likes failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unlike a profile
// DELETE /api/likes/:profileUserId
router.delete('/:profileUserId', authMiddleware, async (req, res) => {
  try {
    const { profileUserId } = req.params;
    const likerUserId = req.userId;

    const result = await Like.deleteOne({ 
      profileUserId, 
      likerUserId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Like not found' });
    }

    console.log(`[Like] ${likerUserId} unliked ${profileUserId}`);
    res.json({ deleted: true });
  } catch (err) {
    console.error('[ERROR] Unliking failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
