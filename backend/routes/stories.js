import express from 'express';
import Story from '../models/Story.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ─── Create a new story ─────────────────────────────────────────────────────
// POST /api/stories with body { mediaUrl, mediaType: 'image'|'video', duration }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mediaUrl, mediaType = 'image', duration = 5 } = req.body;
    const userId = req.userId;

    if (!mediaUrl) {
      return res.status(400).json({ error: 'mediaUrl is required' });
    }

    // Get user info for the story
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create the story
    const story = new Story({
      id: uuidv4(),
      userId,
      userName: user.name || user.username || 'User',
      userAvatar: user.images?.[0] || '',
      mediaUrl,
      mediaType,
      duration,
    });

    await story.save();

    console.log(`[Story] User ${userId} created a new story`);

    res.status(201).json({ 
      success: true, 
      story 
    });
  } catch (err) {
    console.error('[ERROR] Creating story failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get my stories ─────────────────────────────────────────────────────────
// GET /api/stories/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all non-expired stories for the user
    const stories = await Story.find({ 
      userId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json({
      userId,
      stories,
      count: stories.length
    });
  } catch (err) {
    console.error('[ERROR] Getting my stories failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Get stories for feed (all active stories) ─────────────────────────────
// GET /api/stories/feed
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const currentUserId = req.userId;

    // Get all non-expired stories, excluding current user's own stories
    // (since they see their own in a separate section)
    const stories = await Story.find({ 
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));

    // Group stories by user
    const userStoriesMap = new Map();
    for (const story of stories) {
      if (story.userId === currentUserId) continue; // Skip own stories
      
      if (!userStoriesMap.has(story.userId)) {
        userStoriesMap.set(story.userId, {
          userId: story.userId,
          userName: story.userName,
          userAvatar: story.userAvatar,
          stories: [],
          hasUnviewed: false,
        });
      }
      const userData = userStoriesMap.get(story.userId);
      userData.stories.push(story);
      // Check if current user has viewed this story
      if (!story.viewedBy?.includes(currentUserId)) {
        userData.hasUnviewed = true;
      }
    }

    const feed = Array.from(userStoriesMap.values());

    res.json({
      feed,
      total: feed.length
    });
  } catch (err) {
    console.error('[ERROR] Getting stories feed failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Mark story as viewed ─────────────────────────────────────────────────
// POST /api/stories/:storyId/view
router.post('/:storyId/view', authMiddleware, async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.userId;

    const story = await Story.findOne({ id: storyId });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Add viewer if not already viewed
    if (!story.viewedBy) {
      story.viewedBy = [];
    }
    if (!story.viewedBy.includes(userId)) {
      story.viewedBy.push(userId);
      story.viewCount = (story.viewCount || 0) + 1;
      await story.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Marking story as viewed failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete a story ──────────────────────────────────────────────────────
// DELETE /api/stories/:storyId
router.delete('/:storyId', authMiddleware, async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.userId;

    const story = await Story.findOne({ id: storyId, userId });

    if (!story) {
      return res.status(404).json({ error: 'Story not found or not authorized' });
    }

    await Story.deleteOne({ id: storyId });

    console.log(`[Story] User ${userId} deleted story ${storyId}`);

    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Deleting story failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete expired stories (can be called by anyone) ─────────────────────
// DELETE /api/stories/cleanup/expired
router.delete('/cleanup/expired', async (req, res) => {
  try {
    const result = await Story.deleteMany({ 
      expiresAt: { $lt: new Date() }
    });

    console.log(`[Story] Cleaned up ${result.deletedCount} expired stories`);

    res.json({ 
      success: true, 
      deleted: result.deletedCount 
    });
  } catch (err) {
    console.error('[ERROR] Cleaning up expired stories failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
