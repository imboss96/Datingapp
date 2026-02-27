// transactions.js
// ES module export for transaction routes

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { PACKAGES } from './lipana.js';

const router = Router();

// simple sanity check
router.get('/', (req, res) => {
  res.json({ message: 'Transactions endpoint working.' });
});

// frontend calls this for non-Lipana (dummy) payments
// NOTE: removed authMiddleware for testing - in production should verify auth
router.post('/purchase', async (req, res) => {
  try {
    const { userId, packageId, method } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    const pkg = PACKAGES[packageId];
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid package id' });
    }

    const isPremium = pkg.isPremium || false;
    const coins = pkg.coins || 0;

    const tx = new Transaction({
      id: uuidv4(),
      userId,
      type: isPremium ? 'PREMIUM_UPGRADE' : 'COIN_PURCHASE',
      amount: coins,
      price: pkg.price,
      method: method || 'card',
      status: 'COMPLETED',
      description: 'Dummy payment',
    });
    await tx.save();

    // try to update user if they exist
    let user = null;
    try {
      user = await User.findOne({ _id: userId }).lean();
      if (user) {
        if (isPremium) user.isPremium = true;
        else user.coins = (user.coins || 0) + coins;
        await User.updateOne({ _id: userId }, user);
      }
    } catch (userErr) {
      // user not found or update failed; that's ok for testing
      console.warn('[WARN] Could not update user:', userErr.message);
    }

    res.json({ 
      ok: true, 
      transactionId: tx.id,
      coins: user?.coins ?? coins, 
      isPremium: user?.isPremium ?? isPremium 
    });
  } catch (err) {
    console.error('[ERROR transactions.purchase]', err.message, err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
