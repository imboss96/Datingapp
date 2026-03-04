import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for in-memory storage (file is kept in memory before upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file (allows videos)
  fileFilter: (req, file, cb) => {
    // Accept image and video files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
});

// Upload single image or video
router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    console.log('[DEBUG Upload] Processing ' + (isVideo ? 'video' : 'image') + ' upload:', {
      fieldname: req.file.fieldname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Upload to Cloudinary
    const mediaUrl = await uploadToCloudinary(
      req.file.buffer,
      `${req.userId}_${Date.now()}`
    );

    console.log('[DEBUG Upload] ' + (isVideo ? 'Video' : 'Image') + ' uploaded successfully:', mediaUrl);

    res.json({
      success: true,
      imageUrl: mediaUrl,
      message: (isVideo ? 'Video' : 'Image') + ' uploaded successfully',
    });
  } catch (err) {
    console.error('[ERROR Upload]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

// Upload multiple images or videos
router.post('/upload-images', authMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const videoCount = req.files.filter(f => f.mimetype.startsWith('video/')).length;
    const imageCount = req.files.length - videoCount;
    
    console.log('[DEBUG Upload] Processing batch upload:', {
      count: req.files.length,
      images: imageCount,
      videos: videoCount,
      sizes: req.files.map((f) => f.size),
    });

    // Upload all files in parallel
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(file.buffer, `${req.userId}_${Date.now()}_${index}`)
    );

    const mediaUrls = await Promise.all(uploadPromises);

    console.log('[DEBUG Upload] Batch upload completed:', mediaUrls.length, 'files');

    res.json({
      success: true,
      imageUrls: mediaUrls,
      message: `${mediaUrls.length} files uploaded successfully (${imageCount} images, ${videoCount} videos)`,
    });
  } catch (err) {
    console.error('[ERROR Upload]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to upload images' });
  }
});

export default router;
