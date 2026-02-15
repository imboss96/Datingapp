/**
 * Backend Route Handler for Matches
 * Add this to your backend routes file (backend/routes/users.js)
 */

// GET user's matches
router.get('/:userId/matches', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all mutual likes (both users liked each other)
    const userLikes = await Swipe.find({ userId, action: 'like' }).select('targetUserId');
    const targetUserIds = userLikes.map(s => s.targetUserId);

    // Find users who also liked this user
    const reciprocalLikes = await Swipe.find({
      targetUserId: userId,
      userId: { $in: targetUserIds },
      action: 'like'
    }).select('userId');

    const matchedUserIds = reciprocalLikes.map(s => s.userId);

    // Get detailed match information
    const matches = await Promise.all(
      matchedUserIds.map(async (matchedUserId) => {
        const matchedUser = await User.findById(matchedUserId);
        const currentUser = await User.findById(userId);

        // Calculate interest match
        const commonInterests = matchedUser.interests.filter(interest =>
          currentUser.interests.includes(interest)
        );
        const interestMatch = Math.round((commonInterests.length / Math.max(currentUser.interests.length, 1)) * 100);

        // Get message count from chat
        const chat = await Chat.findOne({
          $or: [
            { participantsKey: `${userId}-${matchedUserId}` },
            { participantsKey: `${matchedUserId}-${userId}` }
          ]
        });

        // Get matched date (first mutual like)
        const swipe = await Swipe.findOne({
          userId,
          targetUserId: matchedUserId,
          action: 'like'
        }).sort({ createdAt: -1 });

        return {
          id: matchedUser._id,
          user: matchedUser,
          matchScore: Math.round((commonInterests.length / 7) * 100), // Assuming 7 interests max
          interestMatch,
          matchedAt: swipe?.createdAt || new Date(),
          messageCount: chat?.messages?.length || 0
        };
      })
    );

    res.json(matches);
  } catch (error) {
    console.error('[ERROR] Failed to fetch matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Record swipe action
router.post('/:userId/swipe', async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetUserId, action } = req.body;

    // Record the swipe
    const swipe = new Swipe({
      userId,
      targetUserId,
      action
    });
    await swipe.save();

    // Check for mutual like (match)
    if (action === 'like') {
      const reciprocalSwipe = await Swipe.findOne({
        userId: targetUserId,
        targetUserId: userId,
        action: 'like'
      });

      if (reciprocalSwipe) {
        // Calculate interest match
        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        const commonInterests = targetUser.interests.filter(interest =>
          user.interests.includes(interest)
        );
        const interestMatch = Math.round((commonInterests.length / Math.max(user.interests.length, 1)) * 100);

        // If interest match is high enough, it's a match
        if (interestMatch >= 70) {
          return res.json({
            matched: true,
            matchedUser: targetUser,
            interestMatch,
            message: 'It\'s a match! You can now message each other.'
          });
        }
      }
    }

    res.json({
      matched: false,
      message: 'Swipe recorded'
    });
  } catch (error) {
    console.error('[ERROR] Failed to record swipe:', error);
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

/**
 * Database Models Required:
 * 
 * Swipe Model:
 * - userId: ObjectId (User who swiped)
 * - targetUserId: ObjectId (User being swiped on)
 * - action: String ('like', 'pass', 'superlike')
 * - createdAt: Date
 * 
 * Existing User Model fields:
 * - id: ObjectId
 * - interests: Array
 * - location: String
 * - images: Array
 * - profilePicture: String
 * - bio: String
 * - age: Number
 * 
 * Existing Chat Model fields:
 * - participantsKey: String (userId1-userId2)
 * - messages: Array
 */
