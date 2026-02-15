import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { initWebPush, getVapidPublicKey, sendPush } from '../utils/push.js';

const router = express.Router();

// Ensure web-push is initialized when server starts
initWebPush();

// Return VAPID public key for client to subscribe
router.get('/vapid-public-key', authMiddleware, async (req, res) => {
  try {
    const key = getVapidPublicKey();
    if (!key) return res.status(500).json({ error: 'VAPID keys not configured on server' });
    res.json({ publicKey: key });
  } catch (err) {
    console.error('[push] vapid-public-key error:', err);
    res.status(500).json({ error: 'Failed to get VAPID key' });
  }
});

// Subscribe (save subscription for user)
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const exists = await PushSubscription.findOne({ endpoint: subscription.endpoint });
    if (exists) {
      exists.userId = req.userId;
      exists.keys = subscription.keys || {};
      exists.updatedAt = new Date();
      await exists.save();
      return res.json({ success: true, message: 'Subscription updated' });
    }

    const doc = new PushSubscription({
      userId: req.userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {}
    });
    await doc.save();
    res.json({ success: true, message: 'Subscription saved' });
  } catch (err) {
    console.error('[push] subscribe error:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe (remove subscription)
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
    await PushSubscription.deleteMany({ endpoint });
    res.json({ success: true });
  } catch (err) {
    console.error('[push] unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Send test notification to current user's subscriptions
router.post('/send-test', authMiddleware, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.userId });
    const payload = {
      title: 'Test Notification',
      body: 'This is a test push notification from Spark Dating',
      data: { url: '/' }
    };
    const results = [];
    for (const s of subs) {
      try {
        await sendPush({ endpoint: s.endpoint, keys: s.keys }, payload);
        results.push({ endpoint: s.endpoint, ok: true });
      } catch (err) {
        results.push({ endpoint: s.endpoint, ok: false, error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    console.error('[push] send-test error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Server-side notification sending to a user (moderator/admin usage)
router.post('/notify-user', authMiddleware, async (req, res) => {
  try {
    const isModerator = req.userRole === 'MODERATOR' || req.userRole === 'ADMIN';
    if (!isModerator) return res.status(403).json({ error: 'Moderator access required' });

    const { userId, title, body, data } = req.body;
    if (!userId || !title) return res.status(400).json({ error: 'Missing fields' });

    const subs = await PushSubscription.find({ userId });
    const payload = { title, body, data: data || {} };

    const results = [];
    for (const s of subs) {
      try {
        await sendPush({ endpoint: s.endpoint, keys: s.keys }, payload);
        results.push({ endpoint: s.endpoint, ok: true });
      } catch (err) {
        results.push({ endpoint: s.endpoint, ok: false, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('[push] notify-user error:', err);
    res.status(500).json({ error: 'Failed to notify user' });
  }
});

export default router;
