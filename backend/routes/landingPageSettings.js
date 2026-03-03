import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import LandingPageSettings from '../models/LandingPageSettings.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Configure multer for in-memory storage (file is kept in memory before upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Middleware to check if user is admin
const adminOnlyMiddleware = (req, res, next) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Get landing page settings
router.get('/landing-page-settings', async (req, res) => {
  try {
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      // Create default settings if they don't exist
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
    console.error('[ERROR] Failed to get landing page settings:', error);
    res.status(500).json({ error: 'Failed to get landing page settings' });
  }
});

// Update landing page settings (admin only)
router.put('/landing-page-settings', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      settings = new LandingPageSettings({
        id: 'default',
        ...updates
      });
    } else {
      // Update only provided fields
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'createdAt') {
          settings[key] = updates[key];
        }
      });
      settings.lastModifiedBy = req.userId;
      settings.lastModifiedAt = new Date();
    }
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[ERROR] Failed to update landing page settings:', error);
    res.status(500).json({ error: 'Failed to update landing page settings' });
  }
});

// Update specific section images
router.put('/landing-page-settings/:section', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const { images } = req.body;
    
    const validSections = ['bannerImages', 'aboutImages', 'memberImages', 'workImages', 'meetImages', 'storyImages', 'footerImages'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      settings = new LandingPageSettings({ id: 'default' });
    }
    
    settings[section] = images || [];
    settings.lastModifiedBy = req.userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(`[ERROR] Failed to update ${req.params.section}:`, error);
    res.status(500).json({ error: `Failed to update ${req.params.section}` });
  }
});

// Add image to section
router.post('/landing-page-settings/:section/image', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const imageData = req.body;
    
    const validSections = ['bannerImages', 'aboutImages', 'memberImages', 'workImages', 'meetImages', 'storyImages', 'footerImages'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      settings = new LandingPageSettings({ id: 'default' });
    }
    
    if (!settings[section]) {
      settings[section] = [];
    }
    
    // Set order automatically if not provided
    if (!imageData.order) {
      imageData.order = settings[section].length;
    }
    
    settings[section].push(imageData);
    settings.lastModifiedBy = req.userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(`[ERROR] Failed to add image to ${req.params.section}:`, error);
    res.status(500).json({ error: `Failed to add image to ${req.params.section}` });
  }
});

// Delete image from section
router.delete('/landing-page-settings/:section/image/:imageIndex', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { section, imageIndex } = req.params;
    
    const validSections = ['bannerImages', 'aboutImages', 'memberImages', 'workImages', 'meetImages', 'storyImages', 'footerImages'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings || !settings[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const index = parseInt(imageIndex);
    if (index < 0 || index >= settings[section].length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }
    
    settings[section].splice(index, 1);
    
    // Reorder remaining images
    settings[section].forEach((img, i) => {
      img.order = i;
    });
    
    settings.lastModifiedBy = req.userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(`[ERROR] Failed to delete image from ${req.params.section}:`, error);
    res.status(500).json({ error: `Failed to delete image from ${req.params.section}` });
  }
});

// Reorder images in section
router.put('/landing-page-settings/:section/reorder', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const { images } = req.body;
    
    const validSections = ['bannerImages', 'aboutImages', 'memberImages', 'workImages', 'meetImages', 'storyImages', 'footerImages'];
    
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      settings = new LandingPageSettings({ id: 'default' });
    }
    
    // Update order for each image
    images.forEach((img, index) => {
      img.order = index;
    });
    
    settings[section] = images;
    settings.lastModifiedBy = req.userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error(`[ERROR] Failed to reorder ${req.params.section}:`, error);
    res.status(500).json({ error: `Failed to reorder ${req.params.section}` });
  }
});

// Update hero text and colors
router.put('/landing-page-settings/hero-settings/update', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const { heroTitle, heroSubtitle, heroCtaText, primaryColor, secondaryColor, hideUnverifiedProfiles, heroVideoUrl, heroVideoOpacity, heroVideoTransparency } = req.body;
    
    let settings = await LandingPageSettings.findOne({ id: 'default' });
    
    if (!settings) {
      settings = new LandingPageSettings({ id: 'default' });
    }
    
    if (heroTitle !== undefined) settings.heroTitle = heroTitle;
    if (heroSubtitle !== undefined) settings.heroSubtitle = heroSubtitle;
    if (heroCtaText !== undefined) settings.heroCtaText = heroCtaText;
    if (primaryColor !== undefined) settings.primaryColor = primaryColor;
    if (secondaryColor !== undefined) settings.secondaryColor = secondaryColor;
    if (hideUnverifiedProfiles !== undefined) settings.hideUnverifiedProfiles = hideUnverifiedProfiles;
    if (heroVideoUrl !== undefined) settings.heroVideoUrl = heroVideoUrl;
    if (heroVideoOpacity !== undefined) settings.heroVideoOpacity = Math.min(1, Math.max(0, heroVideoOpacity));
    if (heroVideoTransparency !== undefined) settings.heroVideoTransparency = Math.min(1, Math.max(0, heroVideoTransparency));
    
    settings.lastModifiedBy = req.userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[ERROR] Failed to update hero settings:', error);
    res.status(500).json({ error: 'Failed to update hero settings' });
  }
});

// Upload image for landing page settings
router.post('/upload-image', authMiddleware, adminOnlyMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('[DEBUG] Admin image upload:', {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(
      req.file.buffer,
      `landing-page-${req.userId}-${Date.now()}`
    );

    console.log('[DEBUG] Landing page image uploaded successfully:', imageUrl);

    res.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully',
    });
  } catch (err) {
    console.error('[ERROR] Failed to upload landing page image:', err.message);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

export default router;
