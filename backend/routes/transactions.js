// transactions.js
// ES module export for transaction routes

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import CoinPackage from '../models/CoinPackage.js';
import { authMiddleware } from '../middleware/auth.js';
import { PACKAGES } from './lipana.js';
import { completePaymentWithEmail, validatePaymentData } from '../utils/paymentHelper.js';

const router = Router();

// simple sanity check
router.get('/', (req, res) => {
  res.json({ message: 'Transactions endpoint working.' });
});

// Test endpoint: List all available payment methods
router.get('/test-methods', (req, res) => {
  const methods = [
    { id: 'stripe', name: 'Stripe (Card)', emoji: '💳' },
    { id: 'paypal', name: 'PayPal', emoji: '🅿️' },
    { id: 'apple_pay', name: 'Apple Pay', emoji: '🍎' },
    { id: 'google_pay', name: 'Google Pay', emoji: 'G' },
    { id: 'lipana', name: 'Lipana (M-Pesa)', emoji: '📱' },
    { id: 'crypto', name: 'Cryptocurrency', emoji: '₿' },
    { id: 'bank_transfer', name: 'Bank Transfer', emoji: '🏦' }
  ];
  console.log('[TRANSACTIONS /test-methods] Available methods:', methods);
  res.json({ ok: true, methods });
});

// Test endpoint: Simulate payment with any method
router.post('/test-payment/:method', async (req, res) => {
  const startTime = Date.now();
  const { method } = req.params;
  const { userId, packageId } = req.body;

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[TRANSACTIONS /test-payment/${method}] ► PAYMENT REQUEST`);
    console.log(`  User: ${userId}`);
    console.log(`  Package: ${packageId}`);
    console.log(`  Method: ${method}`);

    // Validate input
    const validation = validatePaymentData({ userId, packageId, method });
    if (!validation.isValid) {
      console.log(`[TRANSACTIONS /test-payment/${method}] ✗ Validation failed:`, validation.errors);
      return res.status(400).json({ error: validation.errors.join('; ') });
    }

    // Find or create transaction
    const tx = new Transaction({
      id: uuidv4(),
      userId,
      type: 'COIN_PURCHASE', // Will be updated by paymentHelper if premium
      amount: 0,
      price: '0',
      method: method,
      status: 'PENDING'
    });
    await tx.save();

    // Complete payment with email
    const result = await completePaymentWithEmail({
      userId,
      packageId,
      method,
      transactionId: tx.id
    });

    if (!result.success) {
      console.log(`[TRANSACTIONS /test-payment/${method}] ✗ Payment failed:`, result.error);
      return res.status(400).json({ ok: false, error: result.error });
    }

    const duration = Date.now() - startTime;
    console.log(`[TRANSACTIONS /test-payment/${method}] ✓ Complete (${duration}ms)`);
    console.log(`${'='.repeat(80)}\n`);

    res.json({
      ok: true,
      success: true,
      transactionId: tx.id,
      method: method,
      message: `✓ Payment processed via ${method}`,
      ...result
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[TRANSACTIONS /test-payment/${method}] ✗ ERROR:`, err.message);
    console.log(`${'='.repeat(80)}\n`);
    res.status(500).json({ error: err.message || 'Payment test failed' });
  }
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

    // First try to find package in CoinPackage collection (new system) by ID if packageId looks like MongoDB ObjectId
    let pkg = null;
    let coins = 0;
    let price = 0;
    let isPremium = false;

    // Check if packageId is a MongoDB ObjectId (24 hex characters)
    if (typeof packageId === 'string' && /^[0-9a-fA-F]{24}$/.test(packageId)) {
      const coinPkg = await CoinPackage.findById(packageId).lean();
      if (coinPkg) {
        coins = coinPkg.coins;
        price = coinPkg.price;
        pkg = coinPkg;
        console.log('[DEBUG transactions.purchase] Found package in CoinPackage collection by MongoDB ID:', { coins, price });
      }
    }

    // Try parsing packageId as custom numeric ID (created by admin in CoinPackage)
    if (!pkg && !isNaN(packageId)) {
      const numId = parseInt(packageId, 10);
      const coinPkg = await CoinPackage.findOne({ id: numId, isActive: true }).lean();
      if (coinPkg) {
        coins = coinPkg.coins;
        price = coinPkg.price;
        pkg = coinPkg;
        console.log('[DEBUG transactions.purchase] Found package by custom numeric id:', { id: numId, coins, price });
      }
    }

    // Try parsing packageId by coins number (if format is 'coins_100')
    if (!pkg && typeof packageId === 'string' && packageId.startsWith('coins_')) {
      const pkgNumber = parseInt(packageId.replace('coins_', ''));
      const coinPkg = await CoinPackage.findOne({ coins: pkgNumber, isActive: true }).lean();
      if (coinPkg) {
        coins = coinPkg.coins;
        price = coinPkg.price;
        pkg = coinPkg;
        console.log('[DEBUG transactions.purchase] Found package by coins number:', { coins, price });
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
      return res.status(400).json({ error: 'Invalid package id. Package not found.' });
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

        // Send confirmation email
        try {
          if (isPremium) {
            // Get plan duration from packageId
            const planMap = {
              'premium_1m': { duration: '1 Month', price: '$4.99' },
              'premium_3m': { duration: '3 Months', price: '$12.99' },
              'premium_6m': { duration: '6 Months', price: '$19.99' },
              'premium_12m': { duration: '12 Months', price: '$29.99' }
            };
            const planInfo = planMap[packageId] || { duration: 'Premium', price };
            const emailResult = await sendPremiumUpgradeEmail(user.email, user.name, planInfo.duration, planInfo.price);
            console.log('[DEBUG transactions.purchase] Email result:', emailResult);
            if (emailResult.success) {
              console.log('[DEBUG transactions.purchase] Premium upgrade email sent to:', user.email);
            } else {
              console.warn('[DEBUG transactions.purchase] Premium email failed:', emailResult.error);
            }
          } else {
            const emailResult = await sendCoinPurchaseEmail(user.email, user.name, coins, price, tx.id);
            console.log('[DEBUG transactions.purchase] Email result:', emailResult);
            if (emailResult.success) {
              console.log('[DEBUG transactions.purchase] Coin purchase email sent to:', user.email);
            } else {
              console.warn('[DEBUG transactions.purchase] Coin purchase email failed:', emailResult.error);
            }
          }
        } catch (emailErr) {
          console.warn('[WARN transactions.purchase] Email sending failed (non-blocking):', emailErr.message);
          // Don't fail the transaction if email fails
        }
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

// Premium package purchase endpoint
router.post('/purchase-premium', async (req, res) => {
  try {
    const { userId, packageId, method } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log('[DEBUG transactions.purchase-premium] Request:', { userId, packageId, method });

    // Import premium package model and helper
    const PremiumPackage = (await import('../models/PremiumPackage.js')).default;
    const { upgradeUserToPremium } = await import('../utils/premiumHelper.js');

    // Find premium package
    const premiumPkg = await PremiumPackage.findById(packageId).lean();
    if (!premiumPkg || !premiumPkg.isActive) {
      return res.status(404).json({ error: 'Premium package not found' });
    }

    // Create transaction
    const tx = new Transaction({
      id: uuidv4(),
      userId,
      type: 'PREMIUM_UPGRADE',
      amount: premiumPkg.price,
      price: `$${premiumPkg.price.toFixed(2)}`,
      method: method || 'card',
      status: 'COMPLETED',
      description: `Premium ${premiumPkg.plan} purchase`,
    });
    await tx.save();

    console.log('[DEBUG transactions.purchase-premium] Transaction created:', tx.id);

    // Update user with premium status
    let user = null;
    try {
      user = await User.findOne({ _id: userId });
      if (user) {
        await upgradeUserToPremium(user, premiumPkg.plan);
        console.log('[DEBUG transactions.purchase-premium] User upgraded to premium:', {
          userId,
          plan: premiumPkg.plan,
          expiresAt: user.premiumExpiresAt
        });
      }
    } catch (userErr) {
      console.warn('[WARN transactions.purchase-premium] Could not update user:', userErr.message);
    }

    res.json({
      ok: true,
      success: true,
      transactionId: tx.id,
      isPremium: user?.isPremium ?? true,
      premiumExpiresAt: user?.premiumExpiresAt,
      plan: premiumPkg.plan
    });
  } catch (err) {
    console.error('[ERROR transactions.purchase-premium]', err.message, err);
    res.status(500).json({ error: err.message || 'Premium purchase failed' });
  }
});

// Initiate premium Lipana payment
router.post('/initiate-premium', async (req, res) => {
  try {
    const { userId, packageId, phoneNumber } = req.body;
    if (!userId || !packageId || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[DEBUG transactions.initiate-premium] Request:', { userId, packageId, phone: phoneNumber });

    // Import models
    const PremiumPackage = (await import('../models/PremiumPackage.js')).default;

    // Find premium package
    const premiumPkg = await PremiumPackage.findById(packageId).lean();
    if (!premiumPkg || !premiumPkg.isActive) {
      return res.status(404).json({ error: 'Premium package not found' });
    }

    // Create transaction record
    const tx = new Transaction({
      id: uuidv4(),
      userId,
      type: 'PREMIUM_UPGRADE',
      amount: premiumPkg.price,
      price: `$${premiumPkg.price.toFixed(2)}`,
      method: 'momo',
      status: 'PENDING',
      description: `Premium ${premiumPkg.plan} via Lipana`,
    });
    await tx.save();

    // Return transaction ID for client to poll status
    res.json({
      ok: true,
      transactionId: tx.id,
      message: 'Mobile money prompt sent. Enter your PIN on your phone.'
    });
  } catch (err) {
    console.error('[ERROR transactions.initiate-premium]', err.message);
    res.status(500).json({ error: err.message || 'Failed to initiate premium payment' });
  }
});

export default router;
