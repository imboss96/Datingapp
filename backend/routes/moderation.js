import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import ModeratorEarnings from '../models/ModeratorEarnings.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware to check if user is moderator (authMiddleware is already applied at app level)
const modOnlyMiddleware = (req, res, next) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    if (!isModerator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Warn user
router.post('/user-action', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId, action, reason, chatId, duration } = req.body;

    if (!userId || !action || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create moderation record
    const modAction = {
      type: action,
      reason,
      moderatorId: req.userId,
      timestamp: new Date(),
      chatId,
      duration
    };

    // Update user based on action
    switch (action) {
      case 'warn':
        user.warnings = (user.warnings || 0) + 1;
        user.lastWarning = new Date();
        break;

      case 'ban':
        user.banned = true;
        user.bannedAt = new Date();
        user.banReason = reason;
        break;

      case 'block':
        if (!user.blockedUsers) user.blockedUsers = [];
        user.blockedUsers.push(req.userId);
        break;

      case 'timeout':
        user.timeoutUntil = new Date(Date.now() + (duration || 3600000));
        break;

      case 'mute':
        user.mutedUntil = new Date(Date.now() + (duration || 3600000));
        break;

      case 'report':
        if (!user.reportedCount) user.reportedCount = 0;
        user.reportedCount += 1;
        break;

      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

    // Add to moderation history
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push(modAction);

    await user.save();

    res.json({
      success: true,
      action,
      userId,
      reason,
      message: `User ${action} successful`,
      user: {
        id: user.id,
        username: user.username,
        warnings: user.warnings,
        banned: user.banned,
        timeoutUntil: user.timeoutUntil,
        mutedUntil: user.mutedUntil
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] User action failed:', error);
    res.status(500).json({ error: 'Failed to apply moderation action' });
  }
});

// Get user moderation history
router.get('/user/:userId/history', modOnlyMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: user.id,
      username: user.username,
      warnings: user.warnings || 0,
      banned: user.banned || false,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      timeoutUntil: user.timeoutUntil,
      mutedUntil: user.mutedUntil,
      reportedCount: user.reportedCount || 0,
      moderationHistory: user.moderationHistory || []
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get history:', error);
    res.status(500).json({ error: 'Failed to get moderation history' });
  }
});

// Lift user ban
router.post('/user/:userId/lift-ban', modOnlyMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.banned = false;
    user.banReason = null;
    user.bannedAt = null;

    // Add to history
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push({
      type: 'lift-ban',
      reason: req.body.reason || 'Ban lifted by moderator',
      moderatorId: req.userId,
      timestamp: new Date()
    });

    await user.save();

    res.json({ success: true, message: 'Ban lifted successfully', userId: user.id });
  } catch (error) {
    console.error('[ERROR moderation] Failed to lift ban:', error);
    res.status(500).json({ error: 'Failed to lift ban' });
  }
});

// Clear timeouts/mutes
router.post('/user/:userId/clear-restrictions', modOnlyMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.timeoutUntil = null;
    user.mutedUntil = null;

    // Add to history
    if (!user.moderationHistory) user.moderationHistory = [];
    user.moderationHistory.push({
      type: 'clear-restrictions',
      reason: req.body.reason || 'Restrictions cleared by moderator',
      moderatorId: req.userId,
      timestamp: new Date()
    });

    await user.save();

    res.json({ success: true, message: 'Restrictions cleared', userId: user.id });
  } catch (error) {
    console.error('[ERROR moderation] Failed to clear restrictions:', error);
    res.status(500).json({ error: 'Failed to clear restrictions' });
  }
});

// Report user
router.post('/report-user', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId, reason, evidence } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = {
      id: uuidv4(),
      reportedUserId: userId,
      reportedBy: req.userId,
      reason,
      evidence,
      timestamp: new Date(),
      status: 'open'
    };

    // In a real app, this would be saved to a Report collection
    // For now, we'll just add it to user's report count
    const user = await User.findById(userId);
    if (user) {
      if (!user.reports) user.reports = [];
      user.reports.push(report);
      await user.save();
    }

    res.json({ success: true, reportId: report.id, message: 'User reported successfully' });
  } catch (error) {
    console.error('[ERROR moderation] Failed to report user:', error);
    res.status(500).json({ error: 'Failed to report user' });
  }
});

// Get moderation dashboard stats
// Get flagged messages (pending moderation)
router.get('/flagged-messages', modOnlyMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({
      'messages.isFlagged': true
    }).lean();

    const flaggedMessages = [];
    chats.forEach(chat => {
      chat.messages.forEach((msg, idx) => {
        if (msg.isFlagged) {
          flaggedMessages.push({
            id: msg._id?.toString() || `${chat.id}-${idx}`,
            chatId: chat.id,
            userId: msg.senderId,
            message: msg.text,
            flagReason: msg.flagReason || 'Flagged content',
            timestamp: msg.timestamp,
            status: 'pending'
          });
        }
      });
    });

    res.json(flaggedMessages);
  } catch (error) {
    console.error('[ERROR moderation] Failed to get flagged messages:', error);
    res.status(500).json({ error: 'Failed to get flagged messages' });
  }
});

router.get('/stats', modOnlyMiddleware, async (req, res) => {
  try {
    const bannedCount = await User.countDocuments({ banned: true });
    const warnedCount = await User.countDocuments({ warnings: { $gt: 0 } });
    const totalUsers = await User.countDocuments();

    res.json({
      totalUsers,
      bannedCount,
      warnedCount,
      bannedPercentage: ((bannedCount / totalUsers) * 100).toFixed(2),
      health: 'good' // Can be calculated based on various factors
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Send message as moderator on behalf of operator/recipient
router.post('/send-response/:chatId', modOnlyMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { recipientId, text } = req.body;

    console.log('[DEBUG] Moderation send-response called:', {
      chatId,
      recipientId,
      userId: req.userId,
      userRole: req.userRole,
      textLength: text?.length
    });

    if (!text || !text.trim()) {
      console.log('[DEBUG] Missing text');
      return res.status(400).json({ error: 'Message text is required' });
    }

    if (!recipientId) {
      console.log('[DEBUG] Missing recipientId');
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      console.log('[DEBUG] Chat not found:', chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Ensure recipient is a participant
    if (!chat.participants.includes(recipientId)) {
      console.log('[DEBUG] Recipient not participant:', {
        recipientId,
        participants: chat.participants
      });
      return res.status(403).json({ error: 'Recipient is not a participant in this chat' });
    }

    const message = {
      id: uuidv4(),
      senderId: recipientId, // Send as the recipient/operator
      text: text.trim(),
      timestamp: Date.now(),
      isFlagged: false,
      isModerationResponse: true, // Flag indicating moderator sent this
      moderatorId: req.userId
    };

    chat.messages.push(message);
    chat.lastUpdated = Date.now();

    // Update unread counts
    const now = Date.now();
    if (!chat.unreadCounts) chat.unreadCounts = new Map();
    if (!chat.lastOpened) chat.lastOpened = new Map();

    chat.participants.forEach(p => {
      if (p === recipientId) {
        // Recipient opened at send time
        chat.lastOpened.set(p, now);
        chat.unreadCounts.set(p, 0);
      } else {
        const current = chat.unreadCounts.get(p) || 0;
        chat.unreadCounts.set(p, current + 1);
      }
    });

    await chat.save();

    console.log('[DEBUG] Moderation response sent successfully. Chat:', chatId, 'From moderator:', req.userId, 'As:', recipientId);

    res.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        text: message.text,
        timestamp: message.timestamp,
        isModerationResponse: true
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to send response:', error.message);
    res.status(500).json({ error: 'Failed to send response: ' + error.message });
  }
});

// Get unreplied chats for moderation view
router.get('/unreplied-chats', modOnlyMiddleware, async (req, res) => {
  try {
    const unrepliedChats = await Chat.find({
      $or: [
        { replyStatus: 'unreplied' },
        { isReplied: false }
      ]
    })
    .sort({ lastUpdated: -1 })
    .lean();

    // Transform chats to match expected format
    const formattedChats = unrepliedChats.map(chat => ({
      id: chat.id,
      participants: chat.participants,
      messages: chat.messages || [],
      lastUpdated: chat.lastUpdated,
      flaggedCount: (chat.messages || []).filter(msg => msg.isFlagged).length,
      replyStatus: chat.replyStatus || 'unreplied'
    }));

    res.json({
      success: true,
      unrepliedChats: formattedChats,
      count: formattedChats.length
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch unreplied chats:', error.message);
    res.status(500).json({ error: 'Failed to fetch unreplied chats: ' + error.message });
  }
});

// Mark chat as replied (when moderator sends a response)
router.put('/mark-replied/:chatId', modOnlyMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    console.log('[DEBUG] Marking chat as replied:', {
      chatId,
      moderatorId: req.userId,
      userRole: req.userRole
    });
    
    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      console.error('[ERROR] Chat not found:', chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    console.log('[DEBUG] Chat found before update:', {
      id: chat.id,
      isReplied: chat.isReplied,
      replyStatus: chat.replyStatus
    });

    // Mark as replied
    chat.isReplied = true;
    chat.replyStatus = 'replied';
    chat.markedAsRepliedAt = Date.now();
    
    await chat.save();

    console.log('[DEBUG] Chat saved successfully:', {
      id: chat.id,
      isReplied: chat.isReplied,
      replyStatus: chat.replyStatus,
      markedAsRepliedAt: chat.markedAsRepliedAt
    });

    res.json({
      success: true,
      message: 'Chat marked as replied',
      chat: {
        id: chat.id,
        isReplied: chat.isReplied,
        replyStatus: chat.replyStatus,
        markedAsRepliedAt: chat.markedAsRepliedAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to mark chat as replied:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to mark chat as replied: ' + error.message });
  }
});

// Get replied chats for moderation view
router.get('/replied-chats', modOnlyMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching replied chats for moderator:', req.userId);

    const repliedChats = await Chat.find({
      $or: [
        { replyStatus: 'replied' },
        { isReplied: true }
      ]
    })
    .sort({ markedAsRepliedAt: -1 });

    console.log('[DEBUG] Found replied chats:', {
      count: repliedChats.length,
      chats: repliedChats.map(c => ({
        id: c.id,
        isReplied: c.isReplied,
        replyStatus: c.replyStatus,
        markedAsRepliedAt: c.markedAsRepliedAt,
        participants: c.participants
      }))
    });

    // Transform chats to match expected format
    const formattedChats = repliedChats.map(chat => ({
      id: chat.id,
      participants: chat.participants,
      messages: chat.messages || [],
      lastUpdated: chat.lastUpdated,
      markedAsRepliedAt: chat.markedAsRepliedAt,
      flaggedCount: (chat.messages || []).filter(msg => msg.isFlagged).length,
      replyStatus: chat.replyStatus || 'replied'
    }));

    res.json({
      success: true,
      repliedChats: formattedChats,
      count: formattedChats.length
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch replied chats:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch replied chats: ' + error.message });
  }
});

// Get moderator session earnings
router.get('/session-earnings', modOnlyMiddleware, async (req, res) => {
  try {
    const moderatorId = req.userId;
    
    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    
    if (!earnings) {
      // Create new earnings record if doesn't exist
      earnings = new ModeratorEarnings({ moderatorId });
      await earnings.save();
    }

    // Check if we need to reset (12:00 hrs = 12:00 UTC)
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(12, 0, 0, 0);
    
    if (earnings.lastResetAt < today) {
      // Move currentSessionEarnings to history and reset
      const today_str = new Date().toISOString().split('T')[0];
      const existingDaily = earnings.dailyEarnings.find(d => 
        new Date(d.date).toISOString().split('T')[0] === today_str
      );
      
      if (existingDaily) {
        existingDaily.amount = earnings.sessionEarnings;
      } else {
        earnings.dailyEarnings.push({
          date: new Date(),
          amount: earnings.sessionEarnings,
          chatsModerated: 0,
          repliesCount: 0
        });
      }
      
      earnings.totalEarnings = (earnings.totalEarnings || 0) + earnings.sessionEarnings;
      earnings.sessionEarnings = 0;
      earnings.lastResetAt = new Date();
      await earnings.save();
    }

    res.json({
      success: true,
      sessionEarnings: earnings.sessionEarnings,
      totalEarnings: earnings.totalEarnings,
      replyRate: earnings.replyRate,
      lastResetAt: earnings.lastResetAt
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get session earnings:', error);
    res.status(500).json({ error: 'Failed to get session earnings' });
  }
});

// Update moderator session earnings (called when moderator replies)
router.post('/session-earnings/add', modOnlyMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const moderatorId = req.userId;
    
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    
    if (!earnings) {
      earnings = new ModeratorEarnings({ moderatorId });
    }

    earnings.sessionEarnings = (earnings.sessionEarnings || 0) + amount;
    earnings.lastEarningsUpdate = new Date();
    
    await earnings.save();

    res.json({
      success: true,
      newSessionEarnings: earnings.sessionEarnings,
      totalEarnings: earnings.totalEarnings
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to add earnings:', error);
    res.status(500).json({ error: 'Failed to add earnings' });
  }
});

// Clear session earnings (called at 12:00 hrs)
router.post('/session-earnings/clear', modOnlyMiddleware, async (req, res) => {
  try {
    const moderatorId = req.userId;
    
    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    
    if (!earnings) {
      return res.status(404).json({ error: 'Earnings record not found' });
    }

    // Save current session earnings to daily history
    const today_str = new Date().toISOString().split('T')[0];
    const existingDaily = earnings.dailyEarnings.find(d => 
      new Date(d.date).toISOString().split('T')[0] === today_str
    );
    
    if (existingDaily) {
      existingDaily.amount = earnings.sessionEarnings;
    } else {
      earnings.dailyEarnings.push({
        date: new Date(),
        amount: earnings.sessionEarnings,
        chatsModerated: 0,
        repliesCount: 0
      });
    }
    
    earnings.totalEarnings = (earnings.totalEarnings || 0) + earnings.sessionEarnings;
    const clearedAmount = earnings.sessionEarnings;
    earnings.sessionEarnings = 0;
    earnings.lastResetAt = new Date();
    
    await earnings.save();

    res.json({
      success: true,
      clearedAmount,
      totalEarnings: earnings.totalEarnings,
      message: 'Session earnings cleared and added to total earnings'
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to clear session earnings:', error);
    res.status(500).json({ error: 'Failed to clear session earnings' });
  }
});

// Get moderated chats (chats worked on by moderator)
router.get('/moderated-chats', modOnlyMiddleware, async (req, res) => {
  try {
    const moderatorId = req.userId;
    
    // Get all chats that have been marked as replied or have moderation actions
    const moderatedChats = await Chat.find({
      $or: [
        { isReplied: true },
        { replyStatus: 'replied' },
        { markedAsRepliedAt: { $exists: true, $ne: null } }
      ]
    })
    .sort({ markedAsRepliedAt: -1 })
    .lean();

    // Format chats with participant information
    const formattedChats = await Promise.all(
      moderatedChats.map(async (chat) => {
        const participantIds = chat.participants || [];
        const participants = await Promise.all(
          participantIds.map(async (id) => {
            const user = await User.findOne({ id }).lean().select('id username name avatar images');
            return {
              id: user?.id || id,
              username: user?.username || 'Unknown',
              name: user?.name || 'Unknown User',
              avatar: user?.avatar || (user?.images && user.images[0]) || null
            };
          })
        );

        return {
          id: chat.id,
          participants,
          participantIds: chat.participants,
          messageCount: (chat.messages || []).length,
          lastUpdated: chat.lastUpdated,
          markedAsRepliedAt: chat.markedAsRepliedAt,
          isReplied: chat.isReplied === true,
          replyStatus: chat.replyStatus || 'replied',
          unreadCounts: chat.unreadCounts ? Object.fromEntries(chat.unreadCounts) : {}
        };
      })
    );

    res.json({
      success: true,
      moderatedChats: formattedChats,
      count: formattedChats.length
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get moderated chats:', error);
    res.status(500).json({ error: 'Failed to get moderated chats' });
  }
});

// Get earnings history (daily breakdown)
router.get('/earnings-history', modOnlyMiddleware, async (req, res) => {
  try {
    const moderatorId = req.userId;
    
    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    
    if (!earnings) {
      earnings = new ModeratorEarnings({ moderatorId });
      await earnings.save();
    }

    res.json({
      success: true,
      dailyHistory: earnings.dailyEarnings || [],
      totalEarnings: earnings.totalEarnings || 0,
      sessionEarnings: earnings.sessionEarnings || 0
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get earnings history:', error);
    res.status(500).json({ error: 'Failed to get earnings history' });
  }
});

export default router;
