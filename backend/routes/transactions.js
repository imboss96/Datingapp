import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get transaction history (requires auth)
router.get('/history/:userId', authMiddleware, async (req, res) => {
  try {
    // Users can only view their own transaction history
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const transactions = await Transaction.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log('[DEBUG Backend] Retrieved', transactions.length, 'transactions for user:', req.params.userId);
    res.json(transactions);
  } catch (err) {
    console.error('[DEBUG Backend] Error retrieving transactions:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Process coin purchase
router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    const { userId, amount, price, method, isPremiumUpgrade } = req.body;

    // Verify user is purchasing for themselves
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Find user
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create transaction
    const transactionId = uuidv4();
    const transaction = new Transaction({
      id: transactionId,
      userId,
      type: amount > 1000 ? 'PREMIUM_UPGRADE' : 'COIN_PURCHASE',
      amount,
      price: price || '$0.00',
      method: method || 'CARD',
      status: 'COMPLETED',
      isPremiumUpgrade: isPremiumUpgrade || (amount > 1000),
      description: isPremiumUpgrade ? 'Premium Membership Upgrade' : `${amount} Coins Purchase`,
    });

    await transaction.save();

    // Update user: add coins and set premium if applicable
    const updateData = {
      coins: user.coins + amount,
      updatedAt: new Date(),
    };

    if (isPremiumUpgrade || amount > 1000) {
      updateData.isPremium = true;
    }

    const updatedUser = await User.findOneAndUpdate(
      { id: userId },
      updateData,
      { new: true }
    ).select('-passwordHash');

    console.log('[DEBUG Backend] Transaction processed:', {
      id: transactionId,
      userId,
      amount,
      newCoins: updatedUser.coins,
      isPremium: updatedUser.isPremium,
    });

    res.status(201).json({
      transaction,
      user: {
        id: updatedUser.id,
        coins: updatedUser.coins,
        isPremium: updatedUser.isPremium,
      },
    });
  } catch (err) {
    console.error('[DEBUG Backend] Error processing transaction:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Refund/cancel transaction
router.post('/:transactionId/cancel', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ id: req.params.transactionId });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify user owns this transaction
    if (req.userId !== transaction.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only allow cancellation of pending transactions
    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot cancel completed transactions' });
    }

    transaction.status = 'CANCELLED';
    await transaction.save();

    console.log('[DEBUG Backend] Transaction cancelled:', req.params.transactionId);
    res.json({ message: 'Transaction cancelled', transaction });
  } catch (err) {
    console.error('[DEBUG Backend] Error cancelling transaction:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
