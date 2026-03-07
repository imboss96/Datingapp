import express from 'express';
import CoinPackage from '../models/CoinPackage.js';
import LandingPageSettings from '../models/LandingPageSettings.js';
import PremiumPackage from '../models/PremiumPackage.js';

const router = express.Router();

// GET all active coin packages (PUBLIC - no auth required)
// Any user can fetch current coin packages to display in profiles
router.get('/coin-packages', async (req, res) => {
  try {
    console.log('[DEBUG public] Fetching coin packages for frontend');
    const packages = await CoinPackage.find({ isActive: true })
      .sort({ displayOrder: 1, id: 1 })
      .lean();
    
    console.log(`[DEBUG public] Found ${packages.length} active coin packages:`, 
      packages.map(p => ({ id: p.id, coins: p.coins, price: p.price }))
    );
    
    res.json({
      success: true,
      packages: packages || []
    });
  } catch (error) {
    console.error('[ERROR public] Failed to fetch coin packages:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch coin packages',
      message: error.message 
    });
  }
});

// GET all coin packages including inactive (for debugging)
router.get('/coin-packages/all', async (req, res) => {
  try {
    console.log('[DEBUG public] Fetching ALL coin packages (debug)');
    const packages = await CoinPackage.find()
      .sort({ displayOrder: 1, id: 1 })
      .lean();
    
    console.log(`[DEBUG public] Total coin packages in DB: ${packages.length}:`,
      packages.map(p => ({ id: p.id, coins: p.coins, price: p.price, isActive: p.isActive }))
    );
    
    res.json({
      success: true,
      packages: packages || []
    });
  } catch (error) {
    console.error('[ERROR public] Failed to fetch all packages:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch packages' 
    });
  }
});

// GET all active premium packages (PUBLIC - no auth required)
router.get('/premium-packages', async (req, res) => {
  try {
    console.log('[DEBUG public] Fetching premium packages for frontend');
    const packages = await PremiumPackage.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    console.log(`[DEBUG public] Found ${packages.length} active premium packages`);

    res.json({
      success: true,
      packages: packages || []
    });
  } catch (error) {
    console.error('[ERROR public] Failed to fetch premium packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium packages',
      message: error.message
    });
  }
});

// GET landing page settings (PUBLIC - no auth required)
router.get('/landing-page-settings', async (req, res) => {
  try {
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      // Return default settings if none exist
      settings = new LandingPageSettings({
        id: 'default',
        bannerImages: [],
        aboutImages: [],
        memberImages: [],
        workImages: [],
        meetImages: [],
        storyImages: [],
        footerImages: []
      });
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('[ERROR public] Failed to fetch landing page settings:', error);
    res.status(500).json({ error: 'Failed to fetch landing page settings' });
  }
});

export default router;
