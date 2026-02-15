import express from 'express';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/matches
 * Get all matches for the current user
 * Query params: limit, skip, sort (createdAt|lastInteractedAt)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, skip = 0, sort = 'createdAt' } = req.query;

    // Find all matches where user is either user1 or user2
    const matches = await Match.find({
      $or: [{ user1Id: userId }, { user2Id: userId }]
    })
      .sort({ [sort]: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Match.countDocuments({
      $or: [{ user1Id: userId }, { user2Id: userId }]
    });

    // Enrich match data with full user profiles
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const isUser1 = match.user1Id === userId;
        const matchedUserId = isUser1 ? match.user2Id : match.user1Id;
        const matchedUser = await User.findOne({ id: matchedUserId }).select('-passwordHash -swipes -matches');

        return {
          ...match.toObject(),
          matchedUser,
          isUser1
        };
      })
    );

    res.json({
      matches: enrichedMatches,
      total,
      hasMore: skip + parseInt(limit) < total
    });
  } catch (err) {
    console.error('[ERROR] Get matches:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/matches/:matchId
 * Get detailed match information
 */
router.get('/:matchId', async (req, res) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check authorization (user must be part of this match)
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this match' });
    }

    // Get both user profiles
    const user1 = await User.findOne({ id: match.user1Id }).select('-passwordHash -swipes');
    const user2 = await User.findOne({ id: match.user2Id }).select('-passwordHash -swipes');

    res.json({
      ...match.toObject(),
      user1,
      user2,
      currentUserId: userId
    });
  } catch (err) {
    console.error('[ERROR] Get match detail:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/matches/:matchId/interact
 * Update lastInteractedAt timestamp (user viewed/interacted with match)
 */
router.put('/:matchId/interact', async (req, res) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check authorization
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    match.lastInteractedAt = new Date();
    await match.save();

    res.json({ 
      message: 'Match interaction recorded',
      lastInteractedAt: match.lastInteractedAt
    });
  } catch (err) {
    console.error('[ERROR] Update match interaction:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/matches/:matchId
 * Unmatch / hide match from user's list
 * (Soft delete: adds user to a hidden list on the Match doc, rather than fully deleting)
 */
router.delete('/:matchId', async (req, res) => {
  try {
    const userId = req.userId;
    const { matchId } = req.params;

    const match = await Match.findOne({ id: matchId });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check authorization
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove from user's match list in User model (soft delete)
    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
    
    const currentUser = await User.findOne({ id: userId });
    if (currentUser && currentUser.matches.includes(otherUserId)) {
      currentUser.matches = currentUser.matches.filter(id => id !== otherUserId);
      await currentUser.save();
    }

    res.json({ message: 'Match removed from your list' });
  } catch (err) {
    console.error('[ERROR] Delete match:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
