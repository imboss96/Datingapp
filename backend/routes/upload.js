import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { authMiddleware } from '../middleware/auth.js';

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

// Upload single image
router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('[DEBUG Upload] Processing image upload:', {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(
      req.file.buffer,
      `${req.userId}_${Date.now()}`
    );

    console.log('[DEBUG Upload] Image uploaded successfully:', imageUrl);

    res.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully',
    });
  } catch (err) {
    console.error('[ERROR Upload]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/upload-images', authMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    console.log('[DEBUG Upload] Processing batch upload:', {
      count: req.files.length,
      sizes: req.files.map((f) => f.size),
    });

    // Upload all images in parallel
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(file.buffer, `${req.userId}_${Date.now()}_${index}`)
    );

    const imageUrls = await Promise.all(uploadPromises);

    console.log('[DEBUG Upload] Batch upload completed:', imageUrls.length, 'images');

    res.json({
      success: true,
      imageUrls,
      message: `${imageUrls.length} images uploaded successfully`,
    });
  } catch (err) {
    console.error('[ERROR Upload]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to upload images' });
  }
});

export default router;
