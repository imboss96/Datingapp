import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import ModeratorEarnings from '../models/ModeratorEarnings.js';
import PaymentMethod from '../models/PaymentMethod.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Transaction from '../models/Transaction.js';
import ActivityLog from '../models/ActivityLog.js';
import CoinPackage from '../models/CoinPackage.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logBan, logWarn, logModeratorAction, logRoleChange } from '../utils/activityLogger.js';

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

// Middleware to check if user is admin
const adminOnlyMiddleware = (req, res, next) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
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
        // Log warning
        await logWarn(userId, reason, req.userId);
        break;

      case 'ban':
        user.banned = true;
        user.bannedAt = new Date();
        user.banReason = reason;
        // Log ban
        await logBan(userId, reason, duration ? 'temporary' : 'permanent', req.userId);
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

    // Log ban lift action
    await logModeratorAction(user.id, 'lift-ban', null, req.body.reason || 'Ban lifted by moderator', req.userId);

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

    // Log restriction clear action
    await logModeratorAction(user.id, 'clear-restrictions', null, req.body.reason || 'Restrictions cleared by moderator', req.userId);

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
      
      // Log the report action
      await logModeratorAction(userId, 'report', null, `User reported: ${reason}`, req.userId);
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
    const moderatorId = req.userId;
    console.log('[DEBUG] Fetching stats for moderator:', moderatorId);

    // Get moderator-specific chat stats
    const assignedChatsCount = await Chat.countDocuments({ assignedModerator: moderatorId });
    const repliedChatsCount = await Chat.countDocuments({ 
      assignedModerator: moderatorId,
      $or: [{ replyStatus: 'replied' }, { isReplied: true }]
    });
    
    // Get moderator earnings/replies count
    const earningsCount = await ModeratorEarnings.countDocuments({ moderatorId });
    const totalEarned = await ModeratorEarnings.aggregate([
      { $match: { moderatorId } },
      { $group: { _id: null, total: { $sum: '$earnedAmount' } } }
    ]);
    
    // Get from activity log if available
    let activityStats = { warnings: 0, bans: 0, reports: 0, flags: 0 };
    try {
      const activities = await ActivityLog.find({ 'actor.userId': moderatorId });
      activityStats.warnings = activities.filter(a => a.action === 'user_warned_in_chat').length;
      activityStats.bans = activities.filter(a => a.action === 'user_suspended').length;
      activityStats.reports = activities.filter(a => a.action === 'report_submitted').length;
      activityStats.flags = activities.filter(a => a.action === 'chat_flagged').length;
    } catch (logError) {
      console.warn('[WARN] Could not fetch activity log stats:', logError.message);
    }
    
    res.json({
      success: true,
      data: {
        chatsModerated: assignedChatsCount || 0,
        chatsReplied: repliedChatsCount || 0,
        replyCount: earningsCount || 0,
        totalEarned: (totalEarned[0]?.total || 0).toFixed(2),
        warningsIssued: activityStats.warnings,
        bansIssued: activityStats.bans,
        totalReports: activityStats.reports,
        flaggedMessages: activityStats.flags,
        replyRate: assignedChatsCount > 0 ? ((repliedChatsCount / assignedChatsCount) * 100).toFixed(2) : 0
      },
      moderatorId: moderatorId
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats: ' + error.message });
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

    // Log moderator response action
    await logModeratorAction(recipientId, 'send-response', chatId, `Moderator sent response to chat`, req.userId);

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
    const moderatorId = req.userId;
    console.log('[DEBUG] Fetching unreplied chats for moderator:', moderatorId);
    
    // Get chats assigned to this moderator OR unassigned chats
    const unrepliedChats = await Chat.find({
      $and: [
        {
          $or: [
            { replyStatus: 'unreplied' },
            { isReplied: false }
          ]
        },
        {
          $or: [
            { assignedModerator: moderatorId },
            { assignedModerator: { $exists: false } },
            { assignedModerator: null }
          ]
        }
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
      replyStatus: chat.replyStatus || 'unreplied',
      assignedModerator: chat.assignedModerator || null
    }));

    res.json({
      success: true,
      chats: formattedChats,
      unrepliedChats: formattedChats,
      count: formattedChats.length,
      moderatorId: moderatorId
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch unreplied chats:', error.message);
    res.status(500).json({ error: 'Failed to fetch unreplied chats: ' + error.message });
  }
});

// PUT /moderation/moderator-profile - Update moderator's own profile
router.put('/moderator-profile', modOnlyMiddleware, async (req, res) => {
  try {
    const moderatorId = req.userId;
    const { name, email, age, location, bio, phone } = req.body;

    console.log('[DEBUG moderation] Updating moderator profile:', { moderatorId, name, email, age, location, phone });

    const user = await User.findById(moderatorId);
    if (!user) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    // Only moderators can update their own profile
    if (user.id !== moderatorId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (age) user.age = parseInt(age) || user.age;
    if (location) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (phone) user.phone = phone;

    // Update timestamp
    user.updatedAt = new Date();

    await user.save();

    console.log('[DEBUG moderation] Moderator profile updated successfully:', { moderatorId, name, email });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        age: user.age,
        bio: user.bio,
        location: user.location,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to update moderator profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      message: error.message 
    });
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
    chat.assignedModerator = req.userId; // Capture which moderator replied
    chat.repliedBy = req.userId; // Track who replied
    
    await chat.save();

    // Create earning record for moderator
    const moderator = await User.findOne({ id: req.userId });
    const earningAmount = 0.50; // $0.50 per chat replied
    
    try {
      const earning = new ModeratorEarnings({
        moderatorId: req.userId,
        moderatorName: moderator?.name || moderator?.username || 'Unknown',
        chatId: chatId,
        earnedAmount: earningAmount,
        status: 'approved',
        repliedAt: new Date(chat.markedAsRepliedAt),
        notes: `Chat reply by moderator ${moderator?.name || moderator?.username}`
      });
      
      await earning.save();
      console.log('[DEBUG] Earning record created:', { userId: req.userId, amount: earningAmount, chatId });
    } catch (earningError) {
      console.error('[ERROR] Failed to create earning record:', earningError);
      // Don't fail the entire operation if earning record fails
    }

    // Log moderator action
    await logModeratorAction(chat.userId, 'replied', chatId, `Chat marked as replied by moderator`, req.userId);

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
    const moderatorId = req.userId;
    console.log('[DEBUG] Fetching replied chats for moderator:', moderatorId);

    // Only get chats assigned to THIS moderator
    const repliedChats = await Chat.find({
      $and: [
        {
          $or: [
            { replyStatus: 'replied' },
            { isReplied: true }
          ]
        },
        {
          assignedModerator: moderatorId
        }
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
        participants: c.participants,
        assignedModerator: c.assignedModerator
      }))
    });

    // Fetch moderator details for all assigned moderators
    const moderatorIds = [...new Set(repliedChats.map(c => c.assignedModerator).filter(Boolean))];
    const moderatorMap = {};
    
    for (const modId of moderatorIds) {
      try {
        const mod = await User.findById(modId).select('id name email username role');
        if (mod) {
          moderatorMap[modId] = {
            id: mod.id,
            name: mod.name,
            email: mod.email,
            username: mod.username,
            role: mod.role
          };
        }
      } catch (err) {
        console.warn(`[WARN] Failed to fetch moderator ${modId}:`, err.message);
      }
    }

    // Transform chats to match expected format
    const formattedChats = repliedChats.map(chat => ({
      id: chat.id,
      participants: chat.participants,
      messages: chat.messages || [],
      lastUpdated: chat.lastUpdated,
      markedAsRepliedAt: chat.markedAsRepliedAt,
      flaggedCount: (chat.messages || []).filter(msg => msg.isFlagged).length,
      replyStatus: chat.replyStatus || 'replied',
      assignedModerator: chat.assignedModerator,
      moderatorDetails: moderatorMap[chat.assignedModerator] || null
    }));

    res.json({
      success: true,
      repliedChats: formattedChats,
      count: formattedChats.length,
      moderators: moderatorMap
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
    
    console.log('[DEBUG] Fetching earnings for moderator:', moderatorId);
    
    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    
    console.log('[DEBUG] Found earnings record:', !!earnings, 'moderatorId:', earnings?.moderatorId);
    
    if (!earnings) {
      // Create new earnings record if doesn't exist
      console.log('[DEBUG] Creating new earnings record for moderator:', moderatorId);
      earnings = new ModeratorEarnings({ 
        moderatorId,
        sessionEarnings: 0,
        totalEarnings: 0,
        dailyEarnings: [],
        lastResetAt: new Date(),
        replyRate: 0
      });
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
    
    // Get only chats THIS moderator has worked on
    const moderatedChats = await Chat.find({
      $and: [
        {
          $or: [
            { isReplied: true },
            { replyStatus: 'replied' },
            { markedAsRepliedAt: { $exists: true, $ne: null } }
          ]
        },
        {
          $or: [
            { assignedModerator: moderatorId },
            { repliedBy: moderatorId },
            { markedAsRepliedAt: { $exists: true, $ne: null } } // fallback for older records
          ]
        }
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
          unreadCounts: chat.unreadCounts || {},
          assignedModerator: chat.assignedModerator,
          moderatorId: moderatorId
        };
      })
    );

    res.json({
      success: true,
      moderatedChats: formattedChats,
      count: formattedChats.length,
      moderatorId: moderatorId
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

// ==================== PAYMENT ENDPOINTS ====================

// Get all payment methods for a moderator
router.get('/payment-methods/:moderatorId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;
    
    // Verify moderator can only access their own payment methods
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const paymentMethods = await PaymentMethod.find({ 
      moderatorId,
      isActive: true 
    }).select('-details').sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      paymentMethods: paymentMethods || [],
      count: paymentMethods.length
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get payment methods:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

// Add a new payment method
router.post('/payment-methods/:moderatorId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;
    const { type, name, details, lastFourDigits, bankName } = req.body;

    // Verify moderator can only add their own payment methods
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!type || !name || !details) {
      return res.status(400).json({ error: 'Missing required fields: type, name, details' });
    }

    // Generate unique ID
    const id = `pm_${moderatorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if this should be the default
    const existingMethods = await PaymentMethod.find({ moderatorId, isActive: true });
    const isDefault = existingMethods.length === 0;

    const paymentMethod = await PaymentMethod.create({
      id,
      moderatorId,
      type,
      name,
      details, // In production, encrypt this
      lastFourDigits,
      bankName,
      isDefault,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        name: paymentMethod.name,
        lastFourDigits: paymentMethod.lastFourDigits,
        bankName: paymentMethod.bankName,
        isDefault: paymentMethod.isDefault,
        createdAt: paymentMethod.createdAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to add payment method:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// Update a payment method
router.put('/payment-methods/:moderatorId/:methodId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId, methodId } = req.params;
    const { type, name, details, lastFourDigits, bankName } = req.body;

    // Verify moderator can only update their own payment methods
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const paymentMethod = await PaymentMethod.findOne({ 
      id: methodId, 
      moderatorId 
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update fields
    if (type) paymentMethod.type = type;
    if (name) paymentMethod.name = name;
    if (details) paymentMethod.details = details; // In production, encrypt this
    if (lastFourDigits) paymentMethod.lastFourDigits = lastFourDigits;
    if (bankName) paymentMethod.bankName = bankName;
    
    paymentMethod.lastUpdated = new Date();
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        name: paymentMethod.name,
        lastFourDigits: paymentMethod.lastFourDigits,
        bankName: paymentMethod.bankName,
        isDefault: paymentMethod.isDefault,
        updatedAt: paymentMethod.updatedAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to update payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Delete a payment method
router.delete('/payment-methods/:moderatorId/:methodId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId, methodId } = req.params;

    // Verify moderator can only delete their own payment methods
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const paymentMethod = await PaymentMethod.findOne({ 
      id: methodId, 
      moderatorId 
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // If this was the default, set another as default
    if (paymentMethod.isDefault) {
      const nextMethod = await PaymentMethod.findOne({
        moderatorId,
        id: { $ne: methodId },
        isActive: true
      });

      if (nextMethod) {
        nextMethod.isDefault = true;
        await nextMethod.save();
      }
    }

    // Soft delete - mark as inactive
    paymentMethod.isActive = false;
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to delete payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// Set a payment method as default
router.put('/payment-methods/:moderatorId/:methodId/set-default', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId, methodId } = req.params;

    // Verify moderator can only update their own payment methods
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove default from all other methods
    await PaymentMethod.updateMany(
      { moderatorId, isActive: true },
      { isDefault: false }
    );

    // Set this method as default
    const paymentMethod = await PaymentMethod.findOne({
      id: methodId,
      moderatorId
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    paymentMethod.isDefault = true;
    await paymentMethod.save();

    res.json({
      success: true,
      message: 'Default payment method updated',
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        name: paymentMethod.name,
        isDefault: paymentMethod.isDefault
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to set default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// Get payment balance
router.get('/payment-balance/:moderatorId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;

    // Verify moderator can only access their own balance
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get pending transactions (not yet paid out)
    const pendingTransactions = await PaymentTransaction.find({
      moderatorId,
      status: { $in: ['pending', 'processing'] }
    });

    // Calculate balance
    let balance = 0;
    pendingTransactions.forEach(tx => {
      if (tx.transactionType === 'payout') {
        balance -= tx.amount;
      } else {
        balance += tx.netAmount;
      }
    });

    // Also get from earnings
    let earnings = await ModeratorEarnings.findOne({ moderatorId });
    if (earnings) {
      balance += earnings.sessionEarnings || 0;
    }

    res.json({
      success: true,
      balance: Math.max(0, balance),
      pendingPayments: pendingTransactions.length,
      currency: 'USD'
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get payment balance:', error);
    res.status(500).json({ error: 'Failed to get payment balance' });
  }
});

// Get payment history
router.get('/payment-history/:moderatorId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Verify moderator can only access their own history
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payments = await PaymentTransaction.find({ moderatorId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-details -errorMessage');

    const total = await PaymentTransaction.countDocuments({ moderatorId });

    res.json({
      success: true,
      payments: payments || [],
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
      hasMore: parseInt(skip) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get payment history:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Record a payment transaction
router.post('/record-payment/:moderatorId', modOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;
    const { amount, methodId, description, transactionType = 'payout' } = req.body;

    // Verify moderator can only record their own payments
    if (req.userId !== moderatorId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!amount || !methodId) {
      return res.status(400).json({ error: 'Missing required fields: amount, methodId' });
    }

    // Verify payment method exists and belongs to moderator
    const paymentMethod = await PaymentMethod.findOne({
      id: methodId,
      moderatorId,
      isActive: true
    });

    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Generate unique transaction ID
    const id = `txn_${moderatorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate processing fee (example: 2.5%)
    const processingFee = amount * 0.025;
    const netAmount = amount - processingFee;

    const paymentTransaction = await PaymentTransaction.create({
      id,
      moderatorId,
      paymentMethodId: methodId,
      amount,
      processingFee,
      netAmount,
      status: 'pending',
      transactionType,
      description: description || 'Moderation earnings',
      events: [{
        status: 'pending',
        notes: 'Transaction initiated',
        timestamp: new Date()
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      transaction: {
        id: paymentTransaction.id,
        amount: paymentTransaction.amount,
        netAmount: paymentTransaction.netAmount,
        processingFee: paymentTransaction.processingFee,
        status: paymentTransaction.status,
        description: paymentTransaction.description,
        createdAt: paymentTransaction.createdAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to record payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get all standalone operators (external signups)
router.get('/standalone', modOnlyMiddleware, async (req, res) => {
  try {
    const standaloneOperators = await User.find({
      accountType: 'STANDALONE',
      role: { $in: ['MODERATOR', 'ADMIN'] }
    }).select('id name email username role accountType createdAt -_id');

    const operatorsWithMetadata = standaloneOperators.map(op => ({
      id: op.id,
      name: op.name,
      email: op.email,
      username: op.username,
      role: op.role,
      accountType: op.accountType,
      joinDate: op.createdAt,
      chatCount: 0
    }));

    res.json({
      success: true,
      count: operatorsWithMetadata.length,
      operators: operatorsWithMetadata
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch standalone operators:', error);
    res.status(500).json({ error: 'Failed to fetch standalone operators' });
  }
});

// Get all onboarded moderators (app users with moderator/admin role)
router.get('/onboarded', modOnlyMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG /onboarded] Fetching onboarded moderators...');
    
    const onboardedModerators = await User.find({
      accountType: 'APP',
      role: { $in: ['MODERATOR', 'ADMIN'] }
    }).select('id name email username role accountType createdAt -_id');

    console.log('[DEBUG /onboarded] Found:', onboardedModerators.length, 'moderators');
    
    const moderatorsWithMetadata = onboardedModerators.map(mod => ({
      id: mod.id,
      name: mod.name,
      email: mod.email,
      username: mod.username,
      role: mod.role,
      accountType: mod.accountType,
      onboardDate: mod.createdAt,
      chatCount: 0
    }));

    res.json({
      success: true,
      count: moderatorsWithMetadata.length,
      moderators: moderatorsWithMetadata
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch onboarded moderators:', error);
    res.status(500).json({ error: 'Failed to fetch onboarded moderators' });
  }
});

// Get chats replied to by a specific moderator
router.get('/moderator/:userId/chats', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    console.log(`[DEBUG] Fetching chats replied by moderator: ${userId}`);
    
    const chats = await Chat.find({ repliedBy: userId })
      .sort({ markedAsRepliedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const totalCount = await Chat.countDocuments({ repliedBy: userId });
    
    res.json({
      success: true,
      count: chats.length,
      totalCount,
      chats
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch moderator chats:', error);
    res.status(500).json({ error: 'Failed to fetch moderator chats' });
  }
});

// Get count of chats replied to by a specific moderator
router.get('/moderator/:userId/chat-count', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[DEBUG] Getting chat count for moderator: ${userId}`);
    
    const count = await Chat.countDocuments({ repliedBy: userId });
    
    res.json({
      success: true,
      userId,
      chatCount: count
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to get chat count for moderator:', error);
    res.status(500).json({ error: 'Failed to get chat count' });
  }
});

// Get moderator earnings summary
router.get('/moderator/:userId/earnings', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`[DEBUG] Fetching earnings summary for moderator: ${userId}`);
    
    // Get total approved and paid earnings
    const approvedEarnings = await ModeratorEarnings.aggregate([
      {
        $match: {
          moderatorId: userId,
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$earnedAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get pending earnings
    const pendingEarnings = await ModeratorEarnings.aggregate([
      {
        $match: {
          moderatorId: userId,
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$earnedAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get paid amount
    const paidEarnings = await ModeratorEarnings.aggregate([
      {
        $match: {
          moderatorId: userId,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$earnedAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      userId,
      summary: {
        totalEarned: approvedEarnings[0]?.totalEarned || 0,
        totalApproved: approvedEarnings[0]?.totalEarned || 0,
        totalPending: pendingEarnings[0]?.totalPending || 0,
        totalPaid: paidEarnings[0]?.totalPaid || 0,
        chatsCompleted: approvedEarnings[0]?.count || 0,
        pendingChats: pendingEarnings[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch moderator earnings:', error);
    res.status(500).json({ error: 'Failed to fetch moderator earnings' });
  }
});

// Get moderator earnings history with pagination
router.get('/moderator/:userId/earnings/history', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, status } = req.query;
    
    console.log(`[DEBUG] Fetching earnings history for moderator: ${userId}`);
    
    const query = { moderatorId: userId };
    if (status) query.status = status;
    
    const earnings = await ModeratorEarnings.find(query)
      .sort({ repliedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    const totalCount = await ModeratorEarnings.countDocuments(query);
    
    res.json({
      success: true,
      count: earnings.length,
      totalCount,
      earnings
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch earnings history:', error);
    res.status(500).json({ error: 'Failed to fetch earnings history' });
  }
});

// Get all moderators earnings summary
router.get('/earnings/summary', modOnlyMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG] Fetching all moderators earnings summary');
    
    const earnings = await ModeratorEarnings.aggregate([
      {
        $match: {
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$moderatorId',
          moderatorName: { $first: '$moderatorName' },
          totalEarned: { $sum: '$earnedAmount' },
          chatsCompleted: { $sum: 1 },
          lastRepliedAt: { $max: '$repliedAt' }
        }
      },
      {
        $sort: { totalEarned: -1 }
      }
    ]);
    
    res.json({
      success: true,
      count: earnings.length,
      earnings
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch earnings summary:', error);
    res.status(500).json({ error: 'Failed to fetch earnings summary' });
  }
});

// Mark earnings as paid
router.post('/moderator/:userId/mark-paid', modOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { earningIds, paymentMethod, transactionId } = req.body;
    
    console.log(`[DEBUG] Marking earnings as paid for moderator: ${userId}`, { earningIds });
    
    const updateResult = await ModeratorEarnings.updateMany(
      { _id: { $in: earningIds } },
      {
        $set: {
          status: 'paid',
          paymentMethod: paymentMethod || 'pending',
          transactionId: transactionId,
          paidAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Earnings marked as paid',
      modifiedCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to mark earnings as paid:', error);
    res.status(500).json({ error: 'Failed to mark earnings as paid' });
  }
});

// Get activity logs
router.get('/logs/activity', modOnlyMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0, action, userId } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments(query);

    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      description: log.description,
      details: log.details,
      timestamp: log.timestamp,
      status: log.status,
      metadata: log.metadata
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// ============ USER MANAGEMENT ENDPOINTS (ADMIN ONLY) ============

// GET all users with filter options
router.get('/users/all', adminOnlyMiddleware, async (req, res) => {
  try {
    const { search, role, accountType, suspended, limit = 50, skip = 0 } = req.query;
    
    // Build query filter
    const filter = {};
    if (role) filter.role = role;
    if (accountType) filter.accountType = accountType;
    if (suspended !== undefined) filter.suspended = suspended === 'true';
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .select('id email name username role accountType suspended suspendedReason suspendedAt age isPhotoVerified isPremium createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      users,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch all users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH suspend/unsuspend user
router.put('/users/:userId/suspend', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspend, reason } = req.body;
    
    console.log(`[DEBUG moderation] Suspend request: userId=${userId}, suspend=${suspend}, moderatorId=${req.userId}`);
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      console.error(`[ERROR moderation] User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (suspend) {
      // Suspend user
      user.suspended = true;
      user.suspendedReason = reason || 'Account suspended by admin';
      user.suspendedAt = new Date();
      console.log(`[DEBUG moderation] Suspending user: ${userId}`);
    } else {
      // Unsuspend user
      user.suspended = false;
      user.suspendedReason = null;
      user.suspendedAt = null;
      console.log(`[DEBUG moderation] Unsuspending user: ${userId}`);
    }
    
    await user.save();
    
    // Log the action
    await logModeratorAction(user.id, suspend ? 'suspended' : 'unsuspended', user.id, `User ${suspend ? 'suspended' : 'unsuspended'} by admin`, req.userId);
    
    res.json({
      success: true,
      message: `User ${suspend ? 'suspended' : 'unsuspended'} successfully`,
      user: {
        id: user.id,
        username: user.username,
        suspended: user.suspended,
        suspendedReason: user.suspendedReason,
        suspendedAt: user.suspendedAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to suspend/unsuspend user:', error);
    res.status(500).json({ error: 'Failed to update user suspension status' });
  }
});

// PUT change user role
router.put('/users/:userId/role', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;
    
    console.log(`[DEBUG moderation] Role change request: userId=${userId}, newRole=${newRole}, moderatorId=${req.userId}`);
    
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, MODERATOR, or ADMIN' });
    }
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      console.error(`[ERROR moderation] User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldRole = user.role;
    user.role = newRole;
    await user.save();
    
    console.log(`[DEBUG moderation] Role changed: ${userId} from ${oldRole} to ${newRole}`);
    
    // Log the action
    await logRoleChange(user.id, oldRole, newRole, req.userId);
    
    res.json({
      success: true,
      message: `User role changed from ${oldRole} to ${newRole}`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to change user role:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

// PUT change account type
router.put('/users/:userId/account-type', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newAccountType } = req.body;
    
    console.log(`[DEBUG moderation] Account type change request: userId=${userId}, newAccountType=${newAccountType}, moderatorId=${req.userId}`);
    
    if (!['APP', 'STANDALONE'].includes(newAccountType)) {
      return res.status(400).json({ error: 'Invalid account type. Must be APP or STANDALONE' });
    }
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      console.error(`[ERROR moderation] User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldAccountType = user.accountType;
    user.accountType = newAccountType;
    await user.save();
    
    console.log(`[DEBUG moderation] Account type changed: ${userId} from ${oldAccountType} to ${newAccountType}`);
    
    res.json({
      success: true,
      message: `User account type changed from ${oldAccountType} to ${newAccountType}`,
      user: {
        id: user.id,
        username: user.username,
        accountType: user.accountType
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to change account type:', error);
    res.status(500).json({ error: 'Failed to change account type' });
  }
});

// PUT manually verify/unverify user (Admin only)
router.put('/users/:userId/verify', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;
    
    console.log(`[DEBUG moderation] Verification change request: userId=${userId}, verified=${verified}, moderatorId=${req.userId}`);
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'Invalid verification status. Must be true or false' });
    }
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      console.error(`[ERROR moderation] User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wasVerified = user.isPhotoVerified;
    user.isPhotoVerified = verified;
    if (verified) {
      user.photoVerifiedAt = new Date();
    } else {
      user.photoVerifiedAt = null;
    }
    await user.save();
    
    console.log(`[DEBUG moderation] Verification changed: ${userId} from ${wasVerified} to ${verified}`);
    
    res.json({
      success: true,
      message: `User ${verified ? 'verified' : 'unverified'} successfully`,
      user: {
        id: user.id,
        username: user.username,
        isPhotoVerified: user.isPhotoVerified,
        photoVerifiedAt: user.photoVerifiedAt
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to change verification status:', error);
    res.status(500).json({ error: 'Failed to change verification status' });
  }
});

// ============== COIN PACKAGES MANAGEMENT ==============

// GET all coin packages
router.get('/coin-packages', adminOnlyMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG moderation] Fetching all coin packages');
    const packages = await CoinPackage.find({ isActive: true })
      .sort({ displayOrder: 1, _id: 1 });
    
    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch coin packages:', error);
    res.status(500).json({ error: 'Failed to fetch coin packages' });
  }
});

// GET coin packages (includes inactive)
router.get('/coin-packages/all', adminOnlyMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG moderation] Fetching all coin packages (including inactive)');
    const packages = await CoinPackage.find()
      .sort({ displayOrder: 1, _id: 1 });
    
    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch coin packages:', error);
    res.status(500).json({ error: 'Failed to fetch coin packages' });
  }
});

// POST create new coin package
router.post('/coin-packages', adminOnlyMiddleware, async (req, res) => {
  try {
    const { coins, price, description, displayOrder } = req.body;
    
    console.log('[DEBUG moderation] Creating new coin package:', { coins, price, description });
    
    // Validation
    if (!coins || !price) {
      return res.status(400).json({ error: 'coins and price are required' });
    }
    
    if (coins <= 0 || price <= 0) {
      return res.status(400).json({ error: 'coins and price must be positive' });
    }
    
    // Get the next ID
    const lastPackage = await CoinPackage.findOne().sort({ id: -1 });
    const nextId = (lastPackage?.id || 0) + 1;
    
    const newPackage = new CoinPackage({
      id: nextId,
      coins,
      price,
      description: description || '',
      displayOrder: displayOrder || nextId,
      isActive: true
    });
    
    await newPackage.save();
    
    console.log('[DEBUG moderation] Coin package created successfully:', newPackage);
    
    res.json({
      success: true,
      message: 'Coin package created successfully',
      package: newPackage
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to create coin package:', error);
    res.status(500).json({ error: 'Failed to create coin package' });
  }
});

// PUT update coin package
router.put('/coin-packages/:id', adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { coins, price, description, displayOrder, isActive } = req.body;
    
    console.log('[DEBUG moderation] Updating coin package:', { id, coins, price, description });
    
    // Validation
    if (coins !== undefined && coins <= 0) {
      return res.status(400).json({ error: 'coins must be positive' });
    }
    
    if (price !== undefined && price <= 0) {
      return res.status(400).json({ error: 'price must be positive' });
    }
    
    const packageId = parseInt(id);
    const pkg = await CoinPackage.findOne({ id: packageId });
    
    if (!pkg) {
      return res.status(404).json({ error: 'Coin package not found' });
    }
    
    // Update fields
    if (coins !== undefined) pkg.coins = coins;
    if (price !== undefined) pkg.price = price;
    if (description !== undefined) pkg.description = description;
    if (displayOrder !== undefined) pkg.displayOrder = displayOrder;
    if (isActive !== undefined) pkg.isActive = isActive;
    
    await pkg.save();
    
    console.log('[DEBUG moderation] Coin package updated successfully:', pkg);
    
    res.json({
      success: true,
      message: 'Coin package updated successfully',
      package: pkg
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to update coin package:', error);
    res.status(500).json({ error: 'Failed to update coin package' });
  }
});

// DELETE coin package
router.delete('/coin-packages/:id', adminOnlyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DEBUG moderation] Deleting coin package:', { id });
    
    const packageId = parseInt(id);
    const pkg = await CoinPackage.findOne({ id: packageId });
    
    if (!pkg) {
      return res.status(404).json({ error: 'Coin package not found' });
    }
    
    // Soft delete by marking inactive
    pkg.isActive = false;
    await pkg.save();
    
    console.log('[DEBUG moderation] Coin package deleted successfully:', pkg);
    
    res.json({
      success: true,
      message: 'Coin package deleted successfully'
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to delete coin package:', error);
    res.status(500).json({ error: 'Failed to delete coin package' });
  }
});

// GET recent coin purchases for admin dashboard
router.get('/coin-purchases', adminOnlyMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    console.log('[DEBUG moderation] Fetching recent coin purchases...');

    // Fetch coin purchase transactions
    const transactions = await Transaction.find({
      type: 'COIN_PURCHASE',
      status: 'COMPLETED'
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get user info for each transaction
    const userIds = [...new Set(transactions.map(t => t.userId))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username email')
      .lean();
    
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Format purchases with user info
    const purchases = transactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      username: userMap.get(tx.userId)?.username || 'Unknown',
      email: userMap.get(tx.userId)?.email || '',
      coins: tx.amount,
      price: tx.price,
      method: tx.method,
      status: tx.status,
      createdAt: tx.createdAt,
      phoneNumber: tx.phoneNumber
    }));

    // Get total count for pagination
    const total = await Transaction.countDocuments({
      type: 'COIN_PURCHASE',
      status: 'COMPLETED'
    });

    console.log(`[DEBUG moderation] Found ${purchases.length} coin purchases`);

    res.json({
      success: true,
      purchases,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch coin purchases:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch coin purchases' 
    });
  }
});

// PUT /moderation/users/:userId/profile - Edit user profile
router.put('/users/:userId/profile', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, name, age, bio, location, role, images } = req.body;

    console.log('[DEBUG moderation] Editing user profile:', { userId, username, email, name, age, bio, location, role, imagesCount: images?.length || 0 });

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (name) user.name = name;
    if (age) user.age = age;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (role) user.role = role;
    if (images && Array.isArray(images)) user.images = images;

    await user.save();

    console.log('[DEBUG moderation] User profile updated successfully:', { userId, username, email, name, imagesCount: user.images?.length || 0 });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        age: user.age,
        bio: user.bio,
        location: user.location,
        role: user.role,
        images: user.images || [],
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to update user profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user profile',
      message: error.message 
    });
  }
});

// POST /moderation/users/create - Create new user (manual onboarding)
router.post('/users/create', adminOnlyMiddleware, async (req, res) => {
  try {
    const { username, email, password, name, age, bio, location, role, accountType, images } = req.body;

    console.log('[DEBUG moderation] Creating new user:', { username, email, name, role, accountType, imagesCount: images?.length || 0 });

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create new user
    const newUser = new User({
      id: uuidv4(),
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || username,
      age: age || 25,
      bio: bio || 'Onboarded by admin',
      location: location || '',
      role: role || 'USER',
      accountType: accountType || 'APP',
      images: images && Array.isArray(images) ? images : [],
      isPhotoVerified: false,
      suspended: false,
      coins: 0,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

    console.log('[DEBUG moderation] New user created successfully:', { userId: newUser._id, username: newUser.username, email: newUser.email, imagesCount: newUser.images?.length || 0 });

    res.json({
      success: true,
      message: 'User profile created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        accountType: newUser.accountType,
        images: newUser.images || [],
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to create user:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create user',
      message: error.message 
    });
  }
});

// ==================== ACTIVITY LOG ENDPOINTS ====================

/**
 * GET /moderation/activity/logs
 * Get activity logs with filtering and pagination
 */
router.get('/activity/logs', adminOnlyMiddleware, async (req, res) => {
  try {
    const { 
      category, 
      action, 
      limit = 50, 
      skip = 0, 
      status,
      actorId,
      targetId,
      startDate,
      endDate,
      search
    } = req.query;

    const filter = {};

    // Add filters
    if (category) filter.category = category;
    if (action) filter.action = action;
    if (status) filter.status = status;
    if (actorId) filter['actor.userId'] = actorId;
    if (targetId) filter['target.id'] = targetId;

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Search in description and details
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { 'actor.name': { $regex: search, $options: 'i' } },
        { 'target.name': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch activity logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /moderation/activity/summary
 * Get activity log statistics and summary
 */
router.get('/activity/summary', adminOnlyMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    // Get activity counts by category
    const categoryStats = await ActivityLog.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get activity counts by action
    const actionStats = await ActivityLog.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get status breakdown
    const statusStats = await ActivityLog.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total financial impact (payments processed)
    const financialStats = await ActivityLog.aggregate([
      { $match: { ...match, 'financial.amount': { $exists: true } } },
      {
        $group: {
          _id: '$action',
          totalAmount: { $sum: '$financial.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get most active actors
    const topActors = await ActivityLog.aggregate([
      { $match: match },
      { 
        $group: {
          _id: '$actor.userId',
          actorName: { $first: '$actor.name' },
          actionCount: { $sum: 1 },
          actions: { $push: '$action' }
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        byCategory: categoryStats,
        byAction: actionStats,
        byStatus: statusStats,
        financial: financialStats,
        topActors
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch activity summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /moderation/activity/user/:userId
 * Get activity logs for a specific user
 */
router.get('/activity/user/:userId', adminOnlyMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 30, skip = 0 } = req.query;

    const filter = {
      $or: [
        { userId },
        { 'actor.userId': userId },
        { 'target.id': userId }
      ]
    };

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch user activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /moderation/activity/moderator/:moderatorId
 * Get activity logs for a specific moderator
 */
router.get('/activity/moderator/:moderatorId', adminOnlyMiddleware, async (req, res) => {
  try {
    const { moderatorId } = req.params;
    const { limit = 30, skip = 0, category } = req.query;

    const filter = { 'actor.userId': moderatorId };
    if (category) filter.category = category;

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch moderator activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /moderation/activity/chat/:chatId
 * Get activity logs for a specific chat
 */
router.get('/activity/chat/:chatId', adminOnlyMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const logs = await ActivityLog.find({ 'target.id': chatId })
      .sort({ timestamp: -1 })
      .lean();

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('[ERROR moderation] Failed to fetch chat activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
