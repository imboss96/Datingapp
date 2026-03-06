import express from 'express';
import PremiumPackage from '../models/PremiumPackage.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import { upgradeUserToPremium } from '../utils/premiumHelper.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS: Get premium packages (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/public/premium-packages
 * Get all active premium packages for frontend display
 */
router.get('/public/premium-packages', async (req, res) => {
  try {
    const packages = await PremiumPackage.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();
    
    res.json({
      success: true,
      packages: packages,
    });
  } catch (err) {
    console.error('[ERROR] Failed to fetch premium packages:', err);
    res.status(500).json({ error: 'Failed to fetch premium packages' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS: Manage premium packages (admin only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/moderation/premium-packages
 * Get all premium packages (admin only)
 */
router.get('/premium-packages', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const packages = await PremiumPackage.find().sort({ displayOrder: 1 });
    
    res.json({
      success: true,
      packages: packages,
    });
  } catch (err) {
    console.error('[ERROR] Failed to fetch premium packages:', err);
    res.status(500).json({ error: 'Failed to fetch premium packages' });
  }
});

/**
 * POST /api/moderation/premium-packages
 * Create a new premium package (admin only)
 */
router.post('/premium-packages', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { packageId, name, duration, plan, price, displayPrice, features, description, displayOrder } = req.body;
    
    // Validation
    if (!packageId || !name || !duration || !plan || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if package already exists
    const existingPackage = await PremiumPackage.findOne({ packageId });
    if (existingPackage) {
      return res.status(409).json({ error: 'Package ID already exists' });
    }
    
    const newPackage = new PremiumPackage({
      packageId,
      name,
      duration,
      plan,
      price,
      displayPrice: displayPrice || `$${price.toFixed(2)}`,
      features: features || [],
      description: description || '',
      displayOrder: displayOrder || 0,
      isActive: true,
    });
    
    await newPackage.save();
    
    console.log('[ADMIN] Premium package created:', newPackage);
    
    res.status(201).json({
      success: true,
      package: newPackage,
      message: 'Premium package created successfully',
    });
  } catch (err) {
    console.error('[ERROR] Failed to create premium package:', err);
    res.status(500).json({ error: err.message || 'Failed to create premium package' });
  }
});

/**
 * PUT /api/moderation/premium-packages/:packageId
 * Update a premium package (admin only)
 */
router.put('/premium-packages/:packageId', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { packageId } = req.params;
    const updates = req.body;
    
    const updatedPackage = await PremiumPackage.findByIdAndUpdate(
      packageId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    console.log('[ADMIN] Premium package updated:', updatedPackage);
    
    res.json({
      success: true,
      package: updatedPackage,
      message: 'Premium package updated successfully',
    });
  } catch (err) {
    console.error('[ERROR] Failed to update premium package:', err);
    res.status(500).json({ error: err.message || 'Failed to update premium package' });
  }
});

/**
 * DELETE /api/moderation/premium-packages/:packageId
 * Delete a premium package (admin only)
 */
router.delete('/premium-packages/:packageId', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { packageId } = req.params;
    
    const deletedPackage = await PremiumPackage.findByIdAndDelete(packageId);
    
    if (!deletedPackage) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    console.log('[ADMIN] Premium package deleted:', deletedPackage);
    
    res.json({
      success: true,
      message: 'Premium package deleted successfully',
    });
  } catch (err) {
    console.error('[ERROR] Failed to delete premium package:', err);
    res.status(500).json({ error: err.message || 'Failed to delete premium package' });
  }
});

/**
 * POST /api/moderation/users/:userId/grant-premium
 * Manually grant premium to a user (admin only)
 */
router.post('/users/:userId/grant-premium', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId } = req.params;
    const { plan } = req.body;
    
    if (!plan || !['1_month', '3_months', '6_months', '12_months'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid premium plan' });
    }
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Upgrade user to premium
    upgradeUserToPremium(user, plan);
    await user.save();
    
    console.log('[ADMIN] Premium granted to user:', { userId, plan, expiresAt: user.premiumExpiresAt });
    
    res.json({
      success: true,
      user: user,
      message: `Premium (${plan}) granted until ${user.premiumExpiresAt.toLocaleDateString()}`,
    });
  } catch (err) {
    console.error('[ERROR] Failed to grant premium:', err);
    res.status(500).json({ error: err.message || 'Failed to grant premium' });
  }
});

/**
 * POST /api/moderation/users/:userId/revoke-premium
 * Revoke premium from a user (admin only)
 */
router.post('/users/:userId/revoke-premium', authMiddleware, async (req, res) => {
  try {
    if (req.userInfo?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId } = req.params;
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Revoke premium
    user.isPremium = false;
    user.premiumPlan = null;
    user.premiumExpiresAt = null;
    await user.save();
    
    console.log('[ADMIN] Premium revoked from user:', userId);
    
    res.json({
      success: true,
      user: user,
      message: 'Premium membership revoked',
    });
  } catch (err) {
    console.error('[ERROR] Failed to revoke premium:', err);
    res.status(500).json({ error: err.message || 'Failed to revoke premium' });
  }
});

export default router;
