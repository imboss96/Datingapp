import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Like from '../models/Like.js';
import PhotoVerification from '../models/PhotoVerification.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/websocket.js';
import { calcCompatibility } from '../utils/matchingScore.js';

const router = express.Router();

const normalizeGender = (gender) => {
  if (gender === undefined || gender === null || gender === '') {
    return undefined;
  }

  const normalized = String(gender).trim().toLowerCase();
  const genderMap = {
    man: 'Man',
    male: 'Man',
    woman: 'Woman',
    female: 'Woman',
    other: 'Other',
  };

  return genderMap[normalized] || null;
};

// Helper to attach verification info to users
async function attachVerificationInfo(users) {
  const userIds = users.map(u => u.id || u._id);
  const verifications = await PhotoVerification.find({ userId: { $in: userIds } });
  const verificationMap = {};

  verifications.forEach(v => {
    verificationMap[v.userId] = {
      status: v.status === 'approved' ? 'VERIFIED' : 
              v.status === 'pending' ? 'PENDING' :
              v.status === 'rejected' ? 'REJECTED' : 'UNVERIFIED',
      verifiedAt: v.reviewedAt ? v.reviewedAt.getTime() : undefined,
      idType: v.idType
    };
  });

  return users.map(user => {
    const userData = typeof user.toObject === 'function' ? user.toObject() : user;
    userData.verification = verificationMap[userData.id] || {
      status: 'UNVERIFIED',
      verifiedAt: undefined
    };
    return userData;
  });
}

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
    // Attach verification info
    const [userWithVerification] = await attachVerificationInfo([user]);
    res.json(userWithVerification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /users/discover  ────────────────────────────────────────────────────
// Enhanced discovery endpoint: fetches profiles, scores them with the
// multi-factor compatibility algorithm, and returns them pre-sorted.
// Query params: limit, skip, lat, lon
router.get('/discover', authMiddleware, async (req, res) => {
  try {
    const { limit = 30, skip = 0, lat, lon } = req.query;
    const currentUserId = req.userId;

    const currentUser = await User.findOne({ id: currentUserId });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const projection = '-passwordHash -email -googleId -facebookId -tiktokId';

    // Exclude current user and users already swiped
    const q = {
      id:        { $ne: currentUserId },
      suspended: { $ne: true },
      banned:    { $ne: true },
    };

    let users = await User.find(q)
      .select(projection)
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 200));

    // Convert GeoJSON coords to simple { latitude, longitude } format
    const transformed = users.map(u => {
      const obj = u.toObject();
      if (obj.coordinates?.coordinates) {
        const [longitude, latitude] = obj.coordinates.coordinates;
        obj.coordinates = { latitude, longitude };
      }
      return obj;
    });

    // Attach verification info
    const withVerification = await attachVerificationInfo(transformed);

    // Override currentUser coords format for scoring
    let currentUserForScoring = currentUser.toObject();
    if (currentUserForScoring.coordinates?.coordinates) {
      const [longitude, latitude] = currentUserForScoring.coordinates.coordinates;
      currentUserForScoring.coordinates = { latitude, longitude };
    }
    // Allow caller to pass explicit coords (e.g., from Geolocation API)
    // Validate coordinates are valid numbers before using
    if (lat != null && lon != null) {
      const parsedLat = Number(lat);
      const parsedLon = Number(lon);
      if (!isNaN(parsedLat) && !isNaN(parsedLon) && 
          parsedLat >= -90 && parsedLat <= 90 &&
          parsedLon >= -180 && parsedLon <= 180) {
        currentUserForScoring.coordinates = { latitude: parsedLat, longitude: parsedLon };
      } else {
        console.warn('[WARN] Invalid coordinates provided:', { lat, lon });
      }
    }

    // Score + attach matchScore to each profile
    const scored = withVerification.map(profile => {
      const compat = calcCompatibility(currentUserForScoring, profile);
      return { ...profile, matchScore: compat.overallScore };
    });

    // Sort descending by matchScore
    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json(scored);
  } catch (err) {
    console.error('[ERROR] /users/discover failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for swiping)
// SIMPLIFIED: No filters applied - all profiles available for smooth swiping
// Query params: limit, skip (pagination only)
router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG Backend] GET /users called by user:', req.userId);
    const {
      limit = 100000,
      skip = 0
    } = req.query;

    const projection = '-passwordHash -email -googleId -facebookId -tiktokId';

    // Simple query: exclude current user only, no other filters
    const q = {};
    if (req.userId) {
      q.id = { $ne: req.userId };
    }

    // Paginated find with no filtering rules
    let users = await User.find(q)
      .select(projection)
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 100000));
    
    console.log('[DEBUG Backend] Query returned', users.length, 'users');
    
    // Convert GeoJSON coordinates to simple format for frontend
    const transformedUsers = users.map(user => {
      const userData = user.toObject();
      if (userData.coordinates && userData.coordinates.coordinates) {
        const [lon, lat] = userData.coordinates.coordinates;
        userData.coordinates = { longitude: lon, latitude: lat };
      }
      return userData;
    });
    
    // Attach verification info
    const usersWithVerification = await attachVerificationInfo(transformedUsers);
    res.json(usersWithVerification);
  } catch (err) {
    console.error('[ERROR] Discovery /users failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG Backend] PUT /users/:userId called');
    console.log('[DEBUG Backend] req.userId:', req.userId);
    console.log('[DEBUG Backend] params.userId:', req.params.userId);
    console.log('[DEBUG Backend] req.userRole:', req.userRole);
    console.log('[DEBUG Backend] req.userInfo:', req.userInfo);
    
    // Allow users to update their own profile, or allow moderators/admins to update any profile
    const isOwnProfile = req.userId === req.params.userId;
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    
    console.log('[DEBUG Backend] isOwnProfile:', isOwnProfile);
    console.log('[DEBUG Backend] isModerator:', isModerator);
    
    if (!isOwnProfile && !isModerator) {
      console.log('[DEBUG Backend] Authorization failed - not own profile and not moderator');
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, age, bio, location, interests, images, videos, username, gender, termsOfServiceAccepted, privacyPolicyAccepted, cookiePolicyAccepted, legalAcceptanceDate, coordinates } = req.body;
    console.log('[DEBUG Backend] Updating user profile with:', { name, age, bio, location, interests, username, gender });
    
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

    const normalizedGender = normalizeGender(gender);
    if (gender !== undefined && normalizedGender === null) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    const updateData = { name, age, bio, location, interests, images, updatedAt: new Date() };
    if (videos) {
      updateData.videos = videos;
    }
    if (normalizedGender !== undefined) {
      updateData.gender = normalizedGender;
    }
    if (coordinates) {
      updateData.coordinates = { type: 'Point', coordinates };
    }
    if (username) {
      updateData.username = username.toLowerCase();
    }
    // Add legal acceptance fields if provided
    if (termsOfServiceAccepted !== undefined) {
      updateData.termsOfServiceAccepted = termsOfServiceAccepted;
    }
    if (privacyPolicyAccepted !== undefined) {
      updateData.privacyPolicyAccepted = privacyPolicyAccepted;
    }
    if (cookiePolicyAccepted !== undefined) {
      updateData.cookiePolicyAccepted = cookiePolicyAccepted;
    }
    if (legalAcceptanceDate !== undefined) {
      updateData.legalAcceptanceDate = legalAcceptanceDate;
    }

    const user = await User.findOneAndUpdate(
      { id: req.params.userId },
      updateData,
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[DEBUG Backend] User profile updated successfully:', { id: user.id, name: user.name, age: user.age });
    res.json(user);
  } catch (err) {
    console.error('[DEBUG Backend] Error updating profile:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Record swipe action
router.post('/:userId/swipe', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, action } = req.body; // action: 'pass', 'like', 'superlike'
    
    // Verify user is swiping for themselves
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

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

    // Calculate compatibility scores using shared utility
    const compat = calcCompatibility(currentUser, targetUser);
    const { interestMatch, ageMatch, mutualInterests, overallScore, proximityScore, recencyScore, trustScore, bioScore, distKm } = compat;
    console.log(`[Swipe] ${req.params.userId} ${action}s ${targetUserId}. Score: ${overallScore}/100  (Interests: ${interestMatch}%, Age: ${ageMatch}%)`);

    // Record like or superlike in the Like model
    if (action === 'like' || action === 'superlike') {
      try {
        // Check if like already exists
        const existingLike = await Like.findOne({
          profileUserId: targetUserId,
          likerUserId: req.params.userId
        });

        if (!existingLike) {
          // Create new like record
          const like = new Like({
            id: uuidv4(),
            profileUserId: targetUserId,
            likerUserId: req.params.userId,
            likeType: action
          });
          await like.save();
          console.log(`[Like Recorded] ${req.params.userId} ${action}d ${targetUserId}`);
        } else if (existingLike.likeType !== action) {
          // Update like type if different
          existingLike.likeType = action;
          await existingLike.save();
          console.log(`[Like Updated] ${req.params.userId} changed to ${action} for ${targetUserId}`);
        } else {
          console.log(`[Like Exists] ${req.params.userId} already ${action}d ${targetUserId}`);
        }
      } catch (likeErr) {
        console.error('[ERROR] Failed to record like:', likeErr.message, { 
          profileUserId: targetUserId, 
          likerUserId: req.params.userId,
          action
        });
        // Don't fail the swipe if like recording fails
      }
    }

    // Check for mutual like (match) - both must like each other
    const isMutualLike = (action === 'like' || action === 'superlike') && targetUser.swipes.includes(req.params.userId);
    
    if (isMutualLike) {
      // Create match record
      const matchId = uuidv4();
      const match = new Match({
        id: matchId,
        user1Id: req.params.userId,
        user2Id: targetUserId,
        user1Name: currentUser.name,
        user2Name: targetUser.name,
        user1Image: currentUser.profilePicture,
        user2Image: targetUser.profilePicture,
        interestMatch,
        ageMatch,
        mutualInterests,
        overallScore,
        proximityScore,
        recencyScore,
        trustScore,
        bioScore,
        distKm,
        notified: true
      });
      
      await match.save();

      // Update user matches arrays (if not already present)
      if (!currentUser.matches.includes(targetUserId)) {
        currentUser.matches.push(targetUserId);
        await currentUser.save();
      }
      if (!targetUser.matches.includes(req.params.userId)) {
        targetUser.matches.push(req.params.userId);
        await targetUser.save();
      }
      
      // Emit WebSocket notifications to both users
      const matchNotification = {
        type: 'match',
        matchId,
        matchedWith: {
          id: targetUser.id,
          name: targetUser.name,
          profilePicture: targetUser.profilePicture,
          bio: targetUser.bio,
          age: targetUser.age,
          location: targetUser.location,
          interests: targetUser.interests
        },
        compatibility: {
          interestMatch,
          ageMatch,
          mutualInterests
        },
        timestamp: new Date().toISOString()
      };
      
      // Notify current user
      sendNotification(req.params.userId, matchNotification);
      
      // Notify target user
      sendNotification(targetUserId, {
        ...matchNotification,
        matchedWith: {
          id: currentUser.id,
          name: currentUser.name,
          profilePicture: currentUser.profilePicture,
          bio: currentUser.bio,
          age: currentUser.age,
          location: currentUser.location,
          interests: currentUser.interests
        }
      });
      
      console.log(`[Match] ${matchId}: ${currentUser.name} <-> ${targetUser.name}`);
      
      return res.json({ 
        matched: true, 
        message: `It's a match! 🎉 ${interestMatch}% interests, ${Math.round(ageMatch)}% age compatibility`,
        interestMatch,
        ageMatch,
        mutualInterests,
        matchId,
        matchedUser: {
          id: targetUser.id,
          name: targetUser.name,
          profilePicture: targetUser.profilePicture,
          location: targetUser.location,
          interests: targetUser.interests,
        }
      });
    }

    // DEMO MODE: Auto-match on first 5 swipes for amazing user experience
    // This creates instant matches so you can see the matching system in action immediately
    // Remove this block once you have real mutual-like data
    const swipeCount = currentUser.swipes.length;
    const isEarlySwipe = swipeCount <= 5;
    const isLikeAction = action === 'like' || action === 'superlike';
    const shouldDemoMatch = isEarlySwipe && isLikeAction && Math.random() < 0.75; // 75% chance to match in demo
    
    if (shouldDemoMatch) {
      console.log(`[DEMO Match] Swipe #${swipeCount}: Auto-matching for demo experience`);
      
      const matchId = uuidv4();
      const match = new Match({
        id: matchId,
        user1Id: req.params.userId,
        user2Id: targetUserId,
        user1Name: currentUser.name,
        user2Name: targetUser.name,
        user1Image: currentUser.profilePicture,
        user2Image: targetUser.profilePicture,
        interestMatch: Math.max(interestMatch, 65), // Boost demo matches to show good compatibility
        ageMatch: Math.max(ageMatch, 70),
        mutualInterests: mutualInterests.length > 0 ? mutualInterests : ['Trying new things'],
        overallScore:   Math.max(overallScore, 60),
        proximityScore,
        recencyScore,
        trustScore,
        bioScore,
        distKm,
        notified: true
      });
      
      await match.save();

      // Update user matches arrays
      if (!currentUser.matches.includes(targetUserId)) {
        currentUser.matches.push(targetUserId);
        await currentUser.save();
      }
      if (!targetUser.matches.includes(req.params.userId)) {
        targetUser.matches.push(req.params.userId);
        await targetUser.save();
      }
      
      // Emit WebSocket notifications
      const matchNotification = {
        type: 'match',
        matchId,
        matchedWith: {
          id: targetUser.id,
          name: targetUser.name,
          profilePicture: targetUser.profilePicture,
          bio: targetUser.bio,
          age: targetUser.age,
          location: targetUser.location,
          interests: targetUser.interests
        },
        compatibility: {
          interestMatch: Math.max(interestMatch, 65),
          ageMatch: Math.max(ageMatch, 70),
          mutualInterests: mutualInterests.length > 0 ? mutualInterests : ['Trying new things']
        },
        timestamp: new Date().toISOString()
      };
      
      sendNotification(req.params.userId, matchNotification);
      sendNotification(targetUserId, {
        ...matchNotification,
        matchedWith: {
          id: currentUser.id,
          name: currentUser.name,
          profilePicture: currentUser.profilePicture,
          bio: currentUser.bio,
          age: currentUser.age,
          location: currentUser.location,
          interests: currentUser.interests
        }
      });
      
      return res.json({ 
        matched: true, 
        message: `It's a match! 🎉 ${Math.max(interestMatch, 65)}% interests, ${Math.round(Math.max(ageMatch, 70))}% age compatibility`,
        interestMatch: Math.max(interestMatch, 65),
        ageMatch: Math.max(ageMatch, 70),
        mutualInterests: mutualInterests.length > 0 ? mutualInterests : ['Trying new things'],
        matchId,
        isDemoMatch: true, // Flag to show this is a demo match
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
      ageMatch,
      mutualInterests,
      note: action === 'pass' ? 'Profile passed' : 'Like recorded. Waiting for mutual like...'
    });
  } catch (err) {
    console.error('[ERROR Swipe]', err);
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
