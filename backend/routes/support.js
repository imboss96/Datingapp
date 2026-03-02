import express from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Submit a contact message (public endpoint)
router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    console.log('[Support] Received contact form submission:', { name, email, subject });

    if (!name || !email || !subject || !message) {
      console.log('[Support] Missing fields:', { name: !!name, email: !!email, subject: !!subject, message: !!message });
      return res.status(400).json({ error: 'All fields are required' });
    }

    const contactMessage = new ContactMessage({
      name,
      email,
      subject,
      message,
      status: 'new',
      priority: 'normal',
    });

    const saved = await contactMessage.save();
    console.log('[Support] Contact message saved with ID:', saved._id);

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We will respond within 24 hours.',
      messageId: saved._id,
    });
  } catch (error) {
    console.error('[Support] Error submitting contact message:', error);
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

// Get all contact messages (moderator only)
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    console.log('[Support] Moderator fetch request from user:', user?._id, 'isModerator:', user?.isModerator, 'isAdmin:', user?.isAdmin);
    
    // Check if user is moderator/admin
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Access denied - not a moderator/admin');
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status, priority, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('[Support] Fetching messages with filter:', filter, 'skip:', skip, 'limit:', limit);

    const messages = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('respondedBy', 'username email');

    const total = await ContactMessage.countDocuments(filter);
    console.log('[Support] Found', messages.length, 'messages, total:', total);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[Support] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get single contact message (moderator only)
router.get('/messages/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    const { id } = req.params;
    console.log('[Support] Fetch single message request:', id);
    
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Single message fetch access denied');
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await ContactMessage.findById(id)
      .populate('respondedBy', 'username email');

    if (!message) {
      console.log('[Support] Single message not found:', id);
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('[Support] Single message found:', id);
    res.json(message);
  } catch (error) {
    console.error('[Support] Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Mark message as read (moderator only)
router.patch('/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    const { id } = req.params;
    console.log('[Support] Mark as read request for message:', id);
    
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Read access denied for user:', user?._id);
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status: 'read' },
      { new: true }
    );
    
    if (!message) {
      console.log('[Support] Message not found:', id);
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('[Support] Message marked as read:', id);
    res.json(message);
  } catch (error) {
    console.error('[Support] Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Respond to contact message (moderator only)
router.post('/messages/:id/respond', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    const { id } = req.params;
    console.log('[Support] Respond to message request:', id, 'from moderator:', user?._id);
    
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Respond access denied');
      return res.status(403).json({ error: 'Access denied' });
    }

    const { response } = req.body;
    if (!response) {
      console.log('[Support] Response body is empty');
      return res.status(400).json({ error: 'Response is required' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      {
        status: 'responded',
        response,
        respondedBy: user._id,
        respondedAt: new Date(),
      },
      { new: true }
    ).populate('respondedBy', 'username email');
    
    if (!message) {
      console.log('[Support] Message not found for respond:', id);
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('[Support] Message responded to:', id);
    res.json(message);
  } catch (error) {
    console.error('[Support] Error responding to message:', error);
    res.status(500).json({ error: 'Failed to respond to message' });
  }
});

// Resolve contact message (moderator only)
router.patch('/messages/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    const { id } = req.params;
    console.log('[Support] Resolve message request:', id);
    
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Resolve access denied');
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status: 'resolved' },
      { new: true }
    );
    
    if (!message) {
      console.log('[Support] Message not found for resolve:', id);
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('[Support] Message marked as resolved:', id);
    res.json(message);
  } catch (error) {
    console.error('[Support] Error resolving message:', error);
    res.status(500).json({ error: 'Failed to resolve message' });
  }
});

// Get statistics (moderator only)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = req.userInfo;
    console.log('[Support] Stats request from user:', user?._id);
    
    if (!user?.isModerator && !user?.isAdmin) {
      console.log('[Support] Stats access denied');
      return res.status(403).json({ error: 'Access denied' });
    }

    const total = await ContactMessage.countDocuments();
    const stats = {
      total,
      new: await ContactMessage.countDocuments({ status: 'new' }),
      read: await ContactMessage.countDocuments({ status: 'read' }),
      responded: await ContactMessage.countDocuments({ status: 'responded' }),
      resolved: await ContactMessage.countDocuments({ status: 'resolved' }),
      high_priority: await ContactMessage.countDocuments({ priority: 'high' }),
    };
    
    console.log('[Support] Stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[Support] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
