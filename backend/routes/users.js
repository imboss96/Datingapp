import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import PhotoVerification from '../models/PhotoVerification.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/websocket.js';

const router = express.Router();

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

// Get all users (for swiping)
// Discovery endpoint: paginated, optional geo, age, interests, and exclude-seen
// Query params: lat, lon, limit, skip, minAge, maxAge, interests (csv), excludeSeen=true
router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG Backend] GET /users called by user:', req.userId);
    console.log('[DEBUG Backend] Query params:', req.query);
    const {
      lat,
      lon,
      limit = 50,
      skip = 0,
      minAge,
      maxAge,
      interests,
      excludeSeen
    } = req.query;

    const q = {};

    // Age filters
    if (minAge) q.age = { ...(q.age || {}), $gte: Number(minAge) };
    if (maxAge) q.age = { ...(q.age || {}), $lte: Number(maxAge) };

    // Exclude current user
    if (req.userId) {
      q.id = { $ne: req.userId };
    }

    // Interests filter (client can pass comma-separated list)
    if (interests) {
      const arr = String(interests).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) q.interests = { $in: arr };
    }

    // FIX 1: Only exclude swiped users (not matched), and cap at last 500
    // so that accounts that have swiped everyone don't get a permanently empty feed.
    // Also removed 'matches' from exclusion — matched users can still appear in discovery.
    if (excludeSeen === 'true' && req.userId) {
      const current = await User.findOne({ id: req.userId }).select('swipes');
      if (current && current.swipes && current.swipes.length > 0) {
        const recentSwipes = current.swipes.slice(-500); // only last 500 swipes
        const excluded = new Set([req.userId, ...recentSwipes]);
        q.id = { $nin: Array.from(excluded) };
      } else {
        q.id = { $ne: req.userId };
      }
    }

    const projection = '-passwordHash -email -googleId';

    // FIX 2: If geo is provided, try $geoNear but fall back gracefully if it fails
    // (e.g. no 2dsphere index) instead of returning an empty array silently.
    if (lat && lon) {
      try {
        const near = {
          $geoNear: {
            near: { type: 'Point', coordinates: [Number(lon), Number(lat)] },
            distanceField: 'distanceMeters',
            spherical: true,
            query: q
          }
        };

        const pipeline = [
          near,
          { $project: { passwordHash: 0, email: 0, googleId: 0 } },
          { $skip: Number(skip) },
          { $limit: Math.min(Number(limit), 200) }
        ];

        const users = await User.aggregate(pipeline);
        console.log('[DEBUG Backend] Geo query returned', users.length, 'users');

        // FIX 3: If geo returns empty results, fall through to regular query
        // instead of returning [] to the client.
        if (users.length > 0) {
          // Convert GeoJSON coordinates to simple format for frontend
          const transformedUsers = users.map(user => {
            if (user.coordinates && user.coordinates.coordinates) {
              const [lon, lat] = user.coordinates.coordinates;
              user.coordinates = { longitude: lon, latitude: lat };
            }
            return user;
          });
          // Attach verification info
          const usersWithVerification = await attachVerificationInfo(transformedUsers);
          return res.json(usersWithVerification);
        }

        console.log('[DEBUG Backend] Geo returned 0, falling back to regular query');
      } catch (geoErr) {
        // $geoNear fails when there is no 2dsphere index on coordinates field.
        // Fall through to regular paginated query below.
        console.warn('[DEBUG Backend] $geoNear failed, falling back to regular query:', geoErr.message);
      }
    }

    // Fallback: paginated find with projection
    const users = await User.find(q).select(projection).skip(Number(skip)).limit(Math.min(Number(limit), 200));
    console.log('[DEBUG Backend] Fallback query executed, returning', users.length, 'users');
    
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
router.put('/:userId', async (req, res) => {
  try {
    console.log('[DEBUG Backend] PUT /users/:userId - req.userId:', req.userId, 'params.userId:', req.params.userId);
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, age, bio, location, interests, images, username, termsOfServiceAccepted, privacyPolicyAccepted, cookiePolicyAccepted, legalAcceptanceDate, coordinates } = req.body;
    console.log('[DEBUG Backend] Updating user profile with:', { name, age, bio, location, interests, images, username, termsOfServiceAccepted, privacyPolicyAccepted, cookiePolicyAccepted });
    
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

    console.log('[DEBUG Backend] User profile updated:', { id: user.id, age: user.age, location: user.location, interests: user.interests, username: user.username, termsOfServiceAccepted: user.termsOfServiceAccepted, privacyPolicyAccepted: user.privacyPolicyAccepted, cookiePolicyAccepted: user.cookiePolicyAccepted });
    res.json(user);
  } catch (err) {
    console.error('[DEBUG Backend] Error updating profile:', err.message);
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

    // Calculate compatibility scores
    const calculateCompatibility = (user1, user2) => {
      if (!user1.interests || !user2.interests || user1.interests.length === 0) {
        return { interestMatch: 0, ageMatch: 0, mutualInterests: [] };
      }
      const commonInterests = user1.interests.filter(interest => 
        user2.interests.includes(interest)
      ).length;
      const totalUniqueInterests = new Set([...user1.interests, ...user2.interests]).size;
      const interestMatch = Math.round((commonInterests / totalUniqueInterests) * 100);
      const mutualInterests = user1.interests.filter(i => user2.interests.includes(i));
      
      // Age compatibility (ideal: within 5 years)
      const ageDiff = Math.abs(user1.age - user2.age);
      const ageMatch = Math.max(0, 100 - (ageDiff * 10));
      
      return { interestMatch, ageMatch, mutualInterests };
    };

    const { interestMatch, ageMatch, mutualInterests } = calculateCompatibility(currentUser, targetUser);
    console.log(`[Swipe] ${req.params.userId} ${action}s ${targetUserId}. Interest: ${interestMatch}%, Age: ${ageMatch}%`);

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