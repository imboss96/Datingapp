// transactions.js
// ES module export for transaction routes

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import CoinPackage from '../models/CoinPackage.js';
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

    console.log('[DEBUG transactions.purchase] Request:', { userId, packageId, method });

    // First try to find package in CoinPackage collection (new system)
    let pkg = null;
    let coins = 0;
    let price = 0;
    let isPremium = false;

    // Try parsing packageId in different formats
    let pkgNumber = null;
    if (packageId.startsWith('coins_')) {
      pkgNumber = parseInt(packageId.replace('coins_', ''));
    }

    if (pkgNumber) {
      const coinPkg = await CoinPackage.findOne({ coins: pkgNumber, isActive: true }).lean();
      if (coinPkg) {
        coins = coinPkg.coins;
        price = coinPkg.price;
        pkg = coinPkg;
        console.log('[DEBUG transactions.purchase] Found package in CoinPackage collection:', coinPkg);
      }
    }

    // Fallback to PACKAGES hardcoded array if not found in DB
    if (!pkg && PACKAGES[packageId]) {
      pkg = PACKAGES[packageId];
      isPremium = pkg.isPremium || false;
      coins = pkg.coins || 0;
      price = pkg.price || '0';
      console.log('[DEBUG transactions.purchase] Using PACKAGES fallback:', pkg);
    }

    if (!coins) {
      return res.status(400).json({ error: 'Invalid package id' });
    }

    const tx = new Transaction({
      id: uuidv4(),
      userId,
      type: isPremium ? 'PREMIUM_UPGRADE' : 'COIN_PURCHASE',
      amount: coins,
      price: typeof price === 'string' ? price : `$${price.toFixed(2)}`,
      method: method || 'card',
      status: 'COMPLETED',
      description: 'Coin purchase',
    });
    await tx.save();

    console.log('[DEBUG transactions.purchase] Transaction created:', tx);

    // try to update user if they exist
    let user = null;
    try {
      user = await User.findOne({ _id: userId }).lean();
      if (user) {
        if (isPremium) user.isPremium = true;
        else user.coins = (user.coins || 0) + coins;
        await User.updateOne({ _id: userId }, user);
        console.log('[DEBUG transactions.purchase] User updated with coins:', { userId, coins: user.coins });
      }
    } catch (userErr) {
      // user not found or update failed; that's ok for testing
      console.warn('[WARN transactions.purchase] Could not update user:', userErr.message);
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
