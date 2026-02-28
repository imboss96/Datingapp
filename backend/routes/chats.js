import express from 'express';
import multer from 'multer';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcastToChatParticipants } from '../utils/websocket.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Helper function to get sorted participants for consistent querying
const getSortedParticipants = (userId1, userId2) => {
  return [userId1, userId2].sort();
};

// Helper to create a stable participantsKey from sorted participants
const makeParticipantsKey = (participantsArray) => {
  return participantsArray.slice().sort().join('_');
};

// Setup multer for file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, PDFs, and audio
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/webm;codecs=opus'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get chats for user (or all chats for moderators)
router.get('/', async (req, res) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    console.log('[DEBUG] Getting chats for user:', req.userId, 'isModerator:', isModerator);
    
    let query;
    if (isModerator) {
      // Moderators/admins can see all chats
      query = Chat.find({}).sort({ lastUpdated: -1 });
      console.log('[DEBUG] Moderator/Admin viewing all chats');
    } else {
      // Regular users only see their own chats
      query = Chat.find({ 
        participants: req.userId,
        $or: [
          { deletedBy: { $exists: false } },
          { deletedBy: { $nin: [req.userId] } }
        ]
      }).sort({ lastUpdated: -1 });
    }
    
    const allChats = await query;
    console.log('[DEBUG] Found', allChats.length, 'total chats for user:', req.userId);

    // IMPORTANT: Ensure all chats have participantsKey (for migration from old data)
    const chatsToUpdate = allChats.filter(chat => !chat.participantsKey);
    if (chatsToUpdate.length > 0) {
      console.log('[WARN] Found', chatsToUpdate.length, 'chats without participantsKey. Fixing...');
      for (const chat of chatsToUpdate) {
        if (chat.participants && chat.participants.length > 0) {
          const key = makeParticipantsKey(chat.participants);
          chat.participantsKey = key;
          await chat.save();
          console.log('[DEBUG] Fixed participantsKey for chat:', chat.id);
        }
      }
    }

    // Deduplication: Group by participantsKey to keep only the latest chat per unique pair
    const chatsByParticipantsKey = {};
    const chatsToKeep = [];
    const chatsToDelete = [];
    
    for (const chat of allChats) {
      const key = chat.participantsKey || (chat.participants ? makeParticipantsKey(chat.participants) : null);
      
      if (!key) {
        console.warn('[WARN] Chat has no valid participants, skipping:', chat.id);
        continue;
      }
      
      if (!chatsByParticipantsKey[key]) {
        chatsByParticipantsKey[key] = chat;
        chatsToKeep.push(chat);
      } else {
        // Keep the one with later lastUpdated
        if (chat.lastUpdated > chatsByParticipantsKey[key].lastUpdated) {
          const oldChat = chatsByParticipantsKey[key];
          chatsToDelete.push(oldChat.id);
          chatsToKeep[chatsToKeep.indexOf(oldChat)] = chat;
          chatsByParticipantsKey[key] = chat;
        } else {
          chatsToDelete.push(chat.id);
        }
      }
    }

    // Hard delete duplicate old chats (keep latest only)
    if (chatsToDelete.length > 0) {
      console.log('[INFO] Deleting', chatsToDelete.length, 'duplicate chats, keeping latest only');
      for (const chatId of chatsToDelete) {
        await Chat.deleteOne({ id: chatId });
        console.log('[DEBUG] Deleted duplicate chat:', chatId);
      }
    }
    
    console.log('[DEBUG] After deduplication:', chatsToKeep.length, 'unique chats');
    
    // Attach unread count for requesting user to each chat object
    const transformed = chatsToKeep.map(c => {
      const obj = c.toObject();
      if (isModerator) {
        // For moderators, attach participant count instead of unread count
        obj.unreadCount = 0;
        obj.isModerator = true;
      } else {
        const unread = (c.unreadCounts && c.unreadCounts.get && c.unreadCounts.get(req.userId)) || 0;
        obj.unreadCount = unread;
        obj.lastOpenedAt = (c.lastOpened && c.lastOpened.get && c.lastOpened.get(req.userId)) || null;
      }
      return obj;
    });

    res.json(transformed);
  } catch (err) {
    console.error('[ERROR] Failed to get chats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get pending chat requests for a user (must be before /:chatId route)
router.get('/requests/pending', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching pending chat requests for user:', req.userId);

    const chats = await Chat.find({
      participants: req.userId,
      requestStatus: 'pending',
    });

    const pendingChats = chats.filter(chat => chat.requestInitiator !== req.userId);
    console.log('[DEBUG] Found', pendingChats.length, 'pending requests');
    res.json(pendingChats);
  } catch (err) {
    console.error('[ERROR] Failed to get pending requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or get chat with user
router.post('/create-or-get', async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const participants = getSortedParticipants(req.userId, otherUserId);

    console.log('[DEBUG] create-or-get chat. User:', req.userId, 'Other:', otherUserId, 'Participants:', participants);

    const participantsKey = makeParticipantsKey(participants);
    console.log('[DEBUG] Looking for chat with participantsKey:', participantsKey);

    // First, try to find any existing chat with these participants (for migration/cleanup)
    let existingChats = await Chat.find({ 
      $or: [
        { participantsKey },
        { participants: { $all: participants } }
      ]
    });

    if (existingChats.length > 1) {
      console.log('[WARN] Found', existingChats.length, 'chats with same participants. Consolidating...');
      
      // Sort by lastUpdated, keep the latest
      existingChats.sort((a, b) => b.lastUpdated - a.lastUpdated);
      const chatToKeep = existingChats[0];
      const chatsToDelete = existingChats.slice(1);

      // Merge all messages from other chats into the latest one
      for (const oldChat of chatsToDelete) {
        if (oldChat.messages && oldChat.messages.length > 0) {
          chatToKeep.messages.push(...oldChat.messages);
          chatToKeep.messages.sort((a, b) => a.timestamp - b.timestamp);
        }
      }

      // Ensure participantsKey is set
      chatToKeep.participantsKey = participantsKey;
      await chatToKeep.save();

      // Delete the old duplicate chats
      for (const oldChat of chatsToDelete) {
        await Chat.deleteOne({ id: oldChat.id });
        console.log('[DEBUG] Deleted duplicate chat:', oldChat.id, '(merged into', chatToKeep.id, ')');
      }

      existingChats = [chatToKeep];
    }

    let chat = existingChats.length > 0 ? existingChats[0] : null;
    let isNewChat = false;

    if (!chat) {
      console.log('[DEBUG] No existing chat found, creating new one');
      // Ensure no duplicate key error by checking again
      try {
        chat = await Chat.findOneAndUpdate(
          { participantsKey },
          {
            $setOnInsert: {
              id: uuidv4(),
              participants,
              participantsKey,
              messages: [],
              lastUpdated: Date.now(),
              requestStatus: 'pending',
              requestInitiator: req.userId,
              requestInitiatorFirstMessage: false,
              blockedBy: [],
              unreadCounts: {},
              lastOpened: {}
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        isNewChat = true;
        console.log('[DEBUG] Created new chat:', chat.id, 'with participantsKey:', chat.participantsKey);
      } catch (upsertErr) {
        if (upsertErr.code === 11000) {
          console.log('[WARN] Duplicate key error during upsert, refetching...');
          chat = await Chat.findOne({ participantsKey });
          if (!chat) {
            throw new Error('Failed to create or retrieve chat after duplicate key error');
          }
          isNewChat = false;
          console.log('[DEBUG] Retrieved chat after duplicate key error:', chat.id);
        } else {
          throw upsertErr;
        }
      }
    } else {
      // Ensure participantsKey is set on existing chat
      if (!chat.participantsKey) {
        chat.participantsKey = participantsKey;
        await chat.save();
        console.log('[DEBUG] Set missing participantsKey on existing chat:', chat.id);
      }
      console.log('[DEBUG] Found existing chat:', chat.id, 'with', chat.messages.length, 'messages');
    }

    res.json({ ...chat.toObject(), isNewChat });
  } catch (err) {
    console.error('[ERROR] Failed to create-or-get chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Clean up duplicate chats (merge into latest, delete others)
router.post('/admin/cleanup-duplicates', async (req, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[INFO] Starting duplicate chat cleanup by admin:', req.userId);

    // Find all chats
    const allChats = await Chat.find({});
    console.log('[INFO] Checking', allChats.length, 'chats for duplicates');

    // Group by participantsKey
    const chatsByKey = {};
    let duplicateCount = 0;

    for (const chat of allChats) {
      // Assign participantsKey if missing
      let key = chat.participantsKey;
      if (!key && chat.participants && chat.participants.length > 0) {
        key = makeParticipantsKey(chat.participants);
        chat.participantsKey = key;
        await chat.save();
      }

      if (!key) {
        console.warn('[WARN] Chat has no valid key, skipping:', chat.id);
        continue;
      }

      if (!chatsByKey[key]) {
        chatsByKey[key] = [];
      }
      chatsByKey[key].push(chat);
    }

    // Consolidate duplicates
    let deletedCount = 0;
    for (const [key, chats] of Object.entries(chatsByKey)) {
      if (chats.length > 1) {
        duplicateCount += (chats.length - 1);
        console.log('[INFO] Found', chats.length, 'duplicate chats with key:', key);

        // Sort by lastUpdated, keep the latest
        chats.sort((a, b) => b.lastUpdated - a.lastUpdated);
        const chatToKeep = chats[0];
        const chatsToDelete = chats.slice(1);

        // Merge messages
        let mergedMessageCount = 0;
        for (const oldChat of chatsToDelete) {
          if (oldChat.messages && oldChat.messages.length > 0) {
            chatToKeep.messages.push(...oldChat.messages);
            mergedMessageCount += oldChat.messages.length;
          }
        }

        // Sort consolidated messages by timestamp
        chatToKeep.messages.sort((a, b) => a.timestamp - b.timestamp);
        await chatToKeep.save();

        // Delete old duplicates
        for (const oldChat of chatsToDelete) {
          await Chat.deleteOne({ id: oldChat.id });
          deletedCount++;
          console.log('[DEBUG] Deleted duplicate chat:', oldChat.id);
        }

        console.log('[INFO] Consolidated chat:', chatToKeep.id, 'with', mergedMessageCount, 'merged messages');
      }
    }

    console.log('[INFO] Cleanup complete. Total duplicates found:', duplicateCount, 'Deleted:', deletedCount);
    res.json({ 
      success: true, 
      duplicatesFound: duplicateCount, 
      chatsDeleted: deletedCount,
      message: `Cleaned up ${deletedCount} duplicate chats`
    });
  } catch (err) {
    console.error('[ERROR] Failed to cleanup duplicates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific chat
router.get('/:chatId', async (req, res) => {
  try {
    console.log('[DEBUG] Getting chat:', req.params.chatId, 'for user:', req.userId, 'role:', req.userRole);
    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      console.log('[DEBUG] Chat not found:', req.params.chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is participant OR is a moderator/admin
    const isParticipant = chat.participants.includes(req.userId);
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    
    if (!isParticipant && !isModerator) {
      console.log('[DEBUG] User not authorized. Participants:', chat.participants, 'User:', req.userId, 'Role:', req.userRole);
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (isModerator && !isParticipant) {
      console.log('[DEBUG] Moderator/Admin accessing chat as root:', req.userId);
    }

    console.log('[DEBUG] Returning chat with', chat.messages.length, 'messages');
    res.json(chat);
  } catch (err) {
    console.error('[ERROR] Failed to get chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload media file for message
router.post('/:chatId/upload', upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const file = req.file;

    if (!file) {
      console.error('[ERROR] No file in upload request');
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('[DEBUG] Uploading media to chat:', chatId, 'file:', file.originalname, 'size:', file.size);

    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      console.error('[ERROR] Chat not found:', chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      console.error('[ERROR] User not authorized. User:', req.userId, 'Participants:', chat.participants);
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Upload to Cloudinary using buffer
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'spark-dating/chat-media',
          filename_override: file.originalname,
          eager: [
            { width: 400, height: 300, crop: 'fill', format: 'jpg' }
          ],
        },
        (error, result) => {
          if (error) {
            console.error('[ERROR] Cloudinary upload error:', error.message);
            reject(error);
          } else {
            console.log('[DEBUG] File uploaded to Cloudinary:', result.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.on('error', (error) => {
        console.error('[ERROR] Upload stream error:', error);
        reject(error);
      });

      uploadStream.end(file.buffer);
    });

    const result = await uploadPromise;

    // Determine media type
    const mediaType = file.mimetype.startsWith('image/') ? 'image'
      : file.mimetype.startsWith('video/') ? 'video'
      : file.mimetype.startsWith('audio/') ? 'audio'
      : file.mimetype === 'application/pdf' ? 'pdf'
      : 'file';

    console.log('[DEBUG] Returning media response for type:', mediaType);
    
    return res.json({
      success: true,
      media: {
        url: result.secure_url,
        type: mediaType,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        duration: result.duration || null,
        width: result.width || null,
        height: result.height || null,
        thumbnail: result.eager?.[0]?.secure_url || result.secure_url,
      }
    });
  } catch (err) {
    console.error('[ERROR] Failed to upload media:', err.message || err);
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Unknown error') });
  }
});

// Send message (with optional media)
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { text, media } = req.body;
    const { chatId } = req.params;
    
    console.log('[DEBUG] Sending message to chat:', chatId, 'from user:', req.userId, 'has media:', !!media);
    
    const chat = await Chat.findOne({ id: chatId });

    if (!chat) {
      console.log('[DEBUG] Chat not found:', chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      console.log('[DEBUG] User not participant. User:', req.userId, 'Participants:', chat.participants);
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!text && !media) {
      return res.status(400).json({ error: 'Message must have text or media' });
    }

    const message = {
      id: uuidv4(),
      senderId: req.userId,
      text: text || '',
      timestamp: Date.now(),
      isFlagged: false,
    };

    if (media) {
      message.media = media;
    }

    chat.messages.push(message);
    chat.lastUpdated = Date.now();

    // Update unread counts and lastOpened
    const now = Date.now();
    if (!chat.unreadCounts) chat.unreadCounts = new Map();
    if (!chat.lastOpened) chat.lastOpened = new Map();

    chat.participants.forEach(p => {
      if (p === req.userId) {
        // Sender opened at send time
        chat.lastOpened.set(p, now);
        chat.unreadCounts.set(p, 0);
      } else {
        const current = chat.unreadCounts.get(p) || 0;
        chat.unreadCounts.set(p, current + 1);
      }
    });

    await chat.save();

    console.log('[DEBUG] Message saved. Chat now has', chat.messages.length, 'messages');

    // Send WebSocket notification to other participants
    const otherParticipants = chat.participants.filter(p => p !== req.userId);
    if (otherParticipants.length > 0) {
      broadcastToChatParticipants(otherParticipants, {
        type: 'new_message',
        chatId: chat.id,
        message: {
          id: message.id,
          senderId: message.senderId,
          text: message.text,
          timestamp: message.timestamp,
          media: message.media,
        },
        senderName: req.userInfo?.name || 'User'
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error('[ERROR] Failed to send message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Edit message
router.put('/:chatId/messages/:messageId', async (req, res) => {
  try {
    const { text } = req.body;
    console.log('[DEBUG] Editing message:', req.params.messageId, 'in chat:', req.params.chatId, 'by user:', req.userId, 'role:', req.userRole);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const isParticipant = chat.participants.includes(req.userId);
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';

    if (!isParticipant && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = chat.messages.find(m => m.id === req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit their own message, but moderators/admins can edit any message
    if (message.senderId !== req.userId && !isModerator) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    message.originalText = message.text;
    message.text = text;
    message.isEdited = true;
    message.editedAt = Date.now();
    if (isModerator && message.senderId !== req.userId) {
      message.isEditedByModerator = true;
    }
    chat.lastUpdated = Date.now();
    await chat.save();

    console.log('[DEBUG] Message edited successfully');
    res.json(message);
  } catch (err) {
    console.error('[ERROR] Failed to edit message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete('/:chatId/messages/:messageId', async (req, res) => {
  try {
    console.log('[DEBUG] Deleting message:', req.params.messageId, 'in chat:', req.params.chatId, 'by user:', req.userId, 'role:', req.userRole);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const isParticipant = chat.participants.includes(req.userId);
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';

    if (!isParticipant && !isModerator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messageIndex = chat.messages.findIndex(m => m.id === req.params.messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = chat.messages[messageIndex];
    // Only sender can delete their message, but moderators/admins can delete any message
    if (message.senderId !== req.userId && !isModerator) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    chat.messages.splice(messageIndex, 1);
    chat.lastUpdated = Date.now();
    await chat.save();

    console.log('[DEBUG] Message deleted successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to delete message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark message as read
router.put('/:chatId/messages/:messageId/read', async (req, res) => {
  try {
    console.log('[DEBUG] Marking message as read:', req.params.messageId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = chat.messages.find(m => m.id === req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.isRead = true;
    message.readAt = Date.now();
    // Reset unread counter for this user and update lastOpened
    if (!chat.unreadCounts) chat.unreadCounts = new Map();
    if (!chat.lastOpened) chat.lastOpened = new Map();
    chat.unreadCounts.set(req.userId, 0);
    chat.lastOpened.set(req.userId, Date.now());
    await chat.save();

    console.log('[DEBUG] Message marked as read');
    res.json(message);
  } catch (err) {
    console.error('[ERROR] Failed to mark message as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all messages as read
router.put('/:chatId/read-all', async (req, res) => {
  try {
    console.log('[DEBUG] Marking all messages as read in chat:', req.params.chatId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    chat.messages.forEach(msg => {
      if (!msg.isRead) {
        msg.isRead = true;
        msg.readAt = Date.now();
      }
    });
    // Reset unread counter and lastOpened for this user
    if (!chat.unreadCounts) chat.unreadCounts = new Map();
    if (!chat.lastOpened) chat.lastOpened = new Map();
    chat.unreadCounts.set(req.userId, 0);
    chat.lastOpened.set(req.userId, Date.now());

    await chat.save();
    console.log('[DEBUG] All messages marked as read');
    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to mark all messages as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Accept chat request
router.put('/:chatId/accept-request', async (req, res) => {
  try {
    console.log('[DEBUG] Accepting chat request:', req.params.chatId, 'by user:', req.userId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (chat.requestStatus === 'blocked' && chat.blockedBy.includes(req.userId)) {
      return res.status(400).json({ error: 'You have blocked this chat' });
    }

    chat.requestStatus = 'accepted';
    await chat.save();
    console.log('[DEBUG] Chat request accepted');
    res.json({ success: true, chat });
  } catch (err) {
    console.error('[ERROR] Failed to accept chat request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Block/reject chat request
router.put('/:chatId/block-request', async (req, res) => {
  try {
    console.log('[DEBUG] Blocking chat:', req.params.chatId, 'by user:', req.userId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add user to blockedBy array if not already there
    if (!chat.blockedBy.includes(req.userId)) {
      chat.blockedBy.push(req.userId);
    }

    chat.requestStatus = 'blocked';
    await chat.save();
    console.log('[DEBUG] Chat blocked by user:', req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to block chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete chat
router.delete('/:chatId', async (req, res) => {
  try {
    console.log('[DEBUG] Deleting chat:', req.params.chatId, 'by user:', req.userId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete all messages in the chat first (optional, but keeps DB clean)
    chat.messages = [];
    
    // Mark as deleted by this user (soft delete approach)
    if (!chat.deletedBy) {
      chat.deletedBy = [];
    }
    if (!chat.deletedBy.includes(req.userId)) {
      chat.deletedBy.push(req.userId);
    }

    // If both participants have deleted, hard delete the chat
    const otherParticipant = chat.participants.find(p => p !== req.userId);
    if (otherParticipant && chat.participants.every(p => chat.deletedBy.includes(p))) {
      await Chat.deleteOne({ id: req.params.chatId });
      console.log('[DEBUG] Chat hard-deleted (both participants deleted)');
      return res.json({ success: true, hardDeleted: true });
    } else {
      // Soft delete: just mark as deleted for this user
      await chat.save();
      console.log('[DEBUG] Chat soft-deleted for user:', req.userId);
      return res.json({ success: true, hardDeleted: false });
    }
  } catch (err) {
    console.error('[ERROR] Failed to delete chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Flag/unflag message (moderators only)
router.put('/:chatId/messages/:messageId/flag', async (req, res) => {
  try {
    const { flag, flagReason } = req.body;
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    
    if (!isModerator) {
      return res.status(403).json({ error: 'Only moderators can flag messages' });
    }

    console.log('[DEBUG] Flag message:', req.params.messageId, 'in chat:', req.params.chatId, 'flag:', flag, 'reason:', flagReason, 'by moderator:', req.userId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = chat.messages.find(m => m.id === req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.isFlagged = flag;
    if (flag && flagReason) {
      message.flagReason = flagReason;
    } else if (!flag) {
      delete message.flagReason;
    }
    
    chat.lastUpdated = Date.now();
    await chat.save();

    console.log('[DEBUG] Message flag updated successfully');
    res.json(message);
  } catch (err) {
    console.error('[ERROR] Failed to flag message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get stalled chats (chats with unanswered messages for too long)
router.get('/stalled', async (req, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const STALLED_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();

    // Find chats where:
    // - Last message is more than 24 hours old
    // - Last message sender is not the same as the current user (unanswered)
    // - Not already assigned to a moderator
    const stalledChats = await Chat.find({
      lastUpdated: { $lt: now - STALLED_THRESHOLD },
      assignedModerator: { $exists: false },
      supportStatus: { $ne: 'resolved' }
    }).sort({ lastUpdated: -1 });

    // Filter to only include chats where the last message is unanswered
    const filteredStalledChats = stalledChats.filter(chat => {
      if (!chat.messages || chat.messages.length === 0) return false;
      
      const lastMessage = chat.messages[chat.messages.length - 1];
      // Check if this chat has at least 2 participants and the last message is from one of them
      return chat.participants.length >= 2 && chat.participants.includes(lastMessage.senderId);
    });

    // Enrich with user data
    const enrichedChats = await Promise.all(
      filteredStalledChats.map(async (chat) => {
        const lastMessage = chat.messages[chat.messages.length - 1];
        const sender = await User.findOne({ id: lastMessage.senderId }).select('name username profilePicture');
        const receiver = await User.findOne({ 
          id: chat.participants.find(p => p !== lastMessage.senderId) 
        }).select('name username profilePicture');

        return {
          ...chat.toObject(),
          lastMessage,
          sender,
          receiver,
          hoursStalled: Math.floor((now - chat.lastUpdated) / (60 * 60 * 1000))
        };
      })
    );

    res.json({ stalledChats: enrichedChats });
  } catch (err) {
    console.error('[ERROR] Failed to get stalled chats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign moderator to a stalled chat
router.post('/:chatId/assign-moderator', async (req, res) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { chatId } = req.params;
    const { moderatorId } = req.body;

    if (!moderatorId) {
      return res.status(400).json({ error: 'Moderator ID required' });
    }

    // Verify moderator exists and has MODERATOR or ADMIN role
    const moderator = await User.findOne({ 
      id: moderatorId, 
      role: { $in: ['MODERATOR', 'ADMIN'] } 
    });
    if (!moderator) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Assign moderator
    chat.assignedModerator = moderatorId;
    chat.supportStatus = 'assigned';
    chat.isStalled = false;
    await chat.save();

    res.json({ 
      message: 'Moderator assigned successfully',
      chat: chat.toObject(),
      moderator: {
        id: moderator.id,
        name: moderator.name,
        username: moderator.username
      }
    });
  } catch (err) {
    console.error('[ERROR] Failed to assign moderator:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get chats assigned to current moderator
router.get('/assigned', async (req, res) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    if (!isModerator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    const assignedChats = await Chat.find({
      assignedModerator: req.userId,
      supportStatus: { $in: ['assigned', 'active'] }
    }).sort({ lastUpdated: -1 });

    // Enrich with user data
    const enrichedChats = await Promise.all(
      assignedChats.map(async (chat) => {
        const participants = await User.find({ 
          id: { $in: chat.participants } 
        }).select('name username profilePicture');

        const participantMap = {};
        participants.forEach(p => {
          participantMap[p.id] = p;
        });

        return {
          ...chat.toObject(),
          participants: chat.participants.map(id => participantMap[id]).filter(Boolean)
        };
      })
    );

    res.json({ assignedChats: enrichedChats });
  } catch (err) {
    console.error('[ERROR] Failed to get assigned chats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send message as moderator in assigned chat
router.post('/:chatId/moderator-message', async (req, res) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    if (!isModerator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    const { chatId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text required' });
    }

    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify moderator is assigned to this chat
    if (chat.assignedModerator !== req.userId) {
      return res.status(403).json({ error: 'Not assigned to this chat' });
    }

    const messageId = uuidv4();
    const timestamp = Date.now();

    const newMessage = {
      id: messageId,
      senderId: req.userId,
      text: text.trim(),
      timestamp,
      isEditedByModerator: true,
      isRead: false
    };

    chat.messages.push(newMessage);
    chat.lastUpdated = timestamp;
    chat.supportStatus = 'active';
    await chat.save();

    // Broadcast to all participants
    broadcastToChatParticipants(chatId, {
      type: 'new_message',
      chatId,
      message: newMessage
    });

    res.json({ message: newMessage });
  } catch (err) {
    console.error('[ERROR] Failed to send moderator message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Resolve support chat (moderator done)
router.post('/:chatId/resolve-support', async (req, res) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    if (!isModerator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    const { chatId } = req.params;

    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify moderator is assigned to this chat
    if (chat.assignedModerator !== req.userId) {
      return res.status(403).json({ error: 'Not assigned to this chat' });
    }

    chat.supportStatus = 'resolved';
    chat.assignedModerator = undefined;
    await chat.save();

    res.json({ message: 'Support chat resolved' });
  } catch (err) {
    console.error('[ERROR] Failed to resolve support chat:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

