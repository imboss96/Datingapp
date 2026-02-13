import express from 'express';
import multer from 'multer';
import Chat from '../models/Chat.js';
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
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get chats for user
router.get('/', async (req, res) => {
  try {
    console.log('[DEBUG] Getting chats for user:', req.userId);
    const chats = await Chat.find({ 
      participants: req.userId,
      $or: [
        { deletedBy: { $exists: false } },
        { deletedBy: { $nin: [req.userId] } }
      ]
    }).sort({ lastUpdated: -1 });
    console.log('[DEBUG] Found', chats.length, 'chats for user:', req.userId);

    // Attach unread count for requesting user to each chat object
    const transformed = chats.map(c => {
      const obj = c.toObject();
      const unread = (c.unreadCounts && c.unreadCounts.get && c.unreadCounts.get(req.userId)) || 0;
      obj.unreadCount = unread;
      obj.lastOpenedAt = (c.lastOpened && c.lastOpened.get && c.lastOpened.get(req.userId)) || null;
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

    // Try to find existing chat first
    let chat = await Chat.findOne({ participantsKey });
    let isNewChat = false;

    if (!chat) {
      console.log('[DEBUG] Chat not found, attempting upsert');
      // Upsert a single chat document for this participant key to avoid duplicates
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
        console.log('[DEBUG] Upserted chat:', chat.id);
      } catch (upsertErr) {
        // Handle duplicate key error (E11000) that can occur under concurrent requests
        if (upsertErr.code === 11000) {
          console.log('[WARN] Duplicate key error during upsert, refetching existing chat:', participantsKey);
          // Re-fetch the document that was created by another concurrent request
          chat = await Chat.findOne({ participantsKey });
          if (!chat) {
            console.error('[ERROR] Chat still not found after duplicate key error. This should not happen.');
            throw new Error('Failed to create or retrieve chat');
          }
          isNewChat = false;
          console.log('[DEBUG] Retrieved existing chat after duplicate key error:', chat.id);
        } else {
          // Re-throw non-duplicate-key errors
          throw upsertErr;
        }
      }
    } else {
      console.log('[DEBUG] Found existing chat:', chat.id, 'status:', chat.requestStatus, 'with', chat.messages.length, 'messages');
    }

    res.json({ ...chat.toObject(), isNewChat });
  } catch (err) {
    console.error('[ERROR] Failed to create-or-get chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific chat
router.get('/:chatId', async (req, res) => {
  try {
    console.log('[DEBUG] Getting chat:', req.params.chatId, 'for user:', req.userId);
    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      console.log('[DEBUG] Chat not found:', req.params.chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.includes(req.userId)) {
      console.log('[DEBUG] User not authorized. Participants:', chat.participants, 'User:', req.userId);
      return res.status(403).json({ error: 'Not authorized' });
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
    console.log('[DEBUG] Editing message:', req.params.messageId, 'in chat:', req.params.chatId);

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

    // Only sender can edit their message
    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    message.originalText = message.text;
    message.text = text;
    message.isEdited = true;
    message.editedAt = Date.now();
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
    console.log('[DEBUG] Deleting message:', req.params.messageId, 'in chat:', req.params.chatId);

    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messageIndex = chat.messages.findIndex(m => m.id === req.params.messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = chat.messages[messageIndex];
    // Only sender can delete their message
    if (message.senderId !== req.userId) {
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

export default router;

