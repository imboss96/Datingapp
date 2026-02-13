import express from 'express';
import Chat from '../models/Chat.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get chats for user
router.get('/', async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.userId });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific chat
router.get('/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ id: req.params.chatId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or get chat with user
router.post('/create-or-get', async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const participants = [req.userId, otherUserId].sort();

    let chat = await Chat.findOne({ participants });
    if (!chat) {
      chat = new Chat({
        id: uuidv4(),
        participants,
        messages: [],
        lastUpdated: Date.now(),
      });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { text } = req.body;
    const chat = await Chat.findOne({ id: req.params.chatId });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const message = {
      id: uuidv4(),
      senderId: req.userId,
      text,
      timestamp: Date.now(),
      isFlagged: false,
    };

    chat.messages.push(message);
    chat.lastUpdated = Date.now();
    await chat.save();

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
