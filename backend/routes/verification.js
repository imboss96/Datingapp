import express from 'express';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import EmailVerification from '../models/EmailVerification.js';
import PhotoVerification from '../models/PhotoVerification.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadPhotoVerificationImage, deleteVerificationPhoto } from '../utils/cloudinary.js';

const router = express.Router();

// Initialize email transporter (using example - configure with your email service)
// For production, use SendGrid, Mailgun, or AWS SES
const initEmailTransporter = () => {
  // Using environmental variables for email config
  if (process.env.EMAIL_FROM && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  // Fallback: use test transporter (won't actually send emails)
  return null;
};

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to user's email
 * POST /api/verification/send-otp
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    const normEmail = String(email).toLowerCase();

    // Check if email is already registered
    const existingUser = await User.findOne({ email: normEmail });
    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({ 
        error: 'Email already verified',
        code: 'EMAIL_ALREADY_VERIFIED'
      });
    }

    // Check for recent OTP attempts (rate limiting)
    const recentOtp = await EmailVerification.findOne({
      email: normEmail,
      verified: false,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last 60 seconds
    });

    if (recentOtp) {
      return res.status(429).json({ 
        error: 'Too many requests. Try again later.',
        code: 'RATE_LIMITED',
        retryAfter: 60
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // Save OTP to database
    const verification = await EmailVerification.create({
      email: normEmail,
      otp,
      expiresAt,
      attempts: 0
    });

    // Send OTP via email
    try {
      const transporter = initEmailTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@datingapp.com',
          to: normEmail,
          subject: 'Dating App - Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0;">Email Verification</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="color: #374151; margin-bottom: 20px;">
                  Thank you for signing up! To verify your email address, please use the following code:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: white; border: 2px solid #ec4899; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ec4899;">
                    ${otp}
                  </div>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                  This code will expire in 10 minutes. If you didn't sign up, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                  Questions? Contact us at support@datingapp.com
                </p>
              </div>
            </div>
          `,
          text: `Your verification code is: ${otp}. This code expires in 10 minutes.`
        });
      } else {
        // In development/testing, log the OTP to console
        console.log(`[VERIFICATION] OTP for ${normEmail}: ${otp}`);
      }
    } catch (emailErr) {
      console.error('[EMAIL ERROR]', emailErr.message);
      // Don't fail the request if email sending fails, but log it
      // In production, you might want to handle this differently
    }

    res.status(200).json({
      message: 'OTP sent successfully',
      email: normEmail,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (err) {
    console.error('[ERROR] send-otp:', err);
    res.status(500).json({ 
      error: 'Failed to send OTP',
      code: 'SEND_OTP_ERROR'
    });
  }
});

/**
 * Verify OTP and mark email as verified
 * POST /api/verification/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        error: 'Email and OTP are required',
        code: 'MISSING_FIELDS'
      });
    }

    const normEmail = String(email).toLowerCase();

    // Find the verification record
    const verification = await EmailVerification.findOne({
      email: normEmail,
      verified: false
    });

    if (!verification) {
      return res.status(400).json({ 
        error: 'No pending verification found',
        code: 'NO_VERIFICATION'
      });
    }

    // Check if OTP has expired
    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: verification._id });
      return res.status(400).json({ 
        error: 'OTP has expired',
        code: 'OTP_EXPIRED'
      });
    }

    // Check if max attempts exceeded
    if (verification.attempts >= verification.maxAttempts) {
      await EmailVerification.deleteOne({ _id: verification._id });
      return res.status(400).json({ 
        error: 'Too many incorrect attempts',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }

    // Verify OTP
    if (verification.otp !== otp.toString()) {
      // Increment attempt counter
      verification.attempts += 1;
      await verification.save();

      return res.status(400).json({ 
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
        attemptsRemaining: verification.maxAttempts - verification.attempts
      });
    }

    // OTP is correct - mark as verified
    verification.verified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    // Update user's email verification status if they exist
    const user = await User.findOne({ email: normEmail });
    if (user) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    res.status(200).json({
      message: 'Email verified successfully',
      email: normEmail,
      verified: true
    });

  } catch (err) {
    console.error('[ERROR] verify-otp:', err);
    res.status(500).json({ 
      error: 'Failed to verify OTP',
      code: 'VERIFY_OTP_ERROR'
    });
  }
});

/**
 * Resend OTP (rate limited)
 * POST /api/verification/resend-otp
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    const normEmail = String(email).toLowerCase();

    // Delete old unverified OTPs for this email
    await EmailVerification.deleteMany({
      email: normEmail,
      verified: false
    });

    // Send new OTP using the send-otp endpoint logic
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verification = await EmailVerification.create({
      email: normEmail,
      otp,
      expiresAt,
      attempts: 0
    });

    // Send email
    try {
      const transporter = initEmailTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@datingapp.com',
          to: normEmail,
          subject: 'Dating App - New Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0;">New Verification Code</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="color: #374151; margin-bottom: 20px;">
                  Here is your new verification code:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: white; border: 2px solid #ec4899; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ec4899;">
                    ${otp}
                  </div>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  This code will expire in 10 minutes.
                </p>
              </div>
            </div>
          `
        });
      } else {
        console.log(`[VERIFICATION] New OTP for ${normEmail}: ${otp}`);
      }
    } catch (emailErr) {
      console.error('[EMAIL ERROR]', emailErr.message);
    }

    res.status(200).json({
      message: 'New OTP sent successfully',
      email: normEmail,
      expiresIn: 600
    });

  } catch (err) {
    console.error('[ERROR] resend-otp:', err);
    res.status(500).json({ 
      error: 'Failed to resend OTP',
      code: 'RESEND_OTP_ERROR'
    });
  }
});

/**
 * Check email verification status
 * GET /api/verification/status/:email
 */
router.get('/status/:email', async (req, res) => {
  try {
    const normEmail = String(req.params.email).toLowerCase();

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(200).json({
      email: normEmail,
      verified: user.emailVerified,
      verifiedAt: user.emailVerifiedAt
    });

  } catch (err) {
    console.error('[ERROR] verification-status:', err);
    res.status(500).json({ 
      error: 'Failed to check verification status',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});

// ============================================================================
// PHOTO VERIFICATION ROUTES (Phase 2 - Trust & Safety)
// ============================================================================

/**
 * POST /api/verification/upload-photo
 * Upload a verification photo for approval
 */
router.post('/upload-photo', authMiddleware, async (req, res) => {
  try {
    const { photoData, fileName } = req.body;
    const userId = req.userId || req.body.userId;

    if (!photoData) {
      return res.status(400).json({ 
        error: 'Photo data required',
        code: 'MISSING_PHOTO'
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'User ID required',
        code: 'MISSING_USER'
      });
    }

    // Check for existing pending verification
    const existingPending = await PhotoVerification.findOne({
      userId,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(409).json({
        error: 'You already have a verification photo pending review',
        code: 'VERIFICATION_PENDING',
        submittedAt: existingPending.submittedAt
      });
    }

    // Check cooldown period for rejected photos (7 days)
    const lastRejected = await PhotoVerification.findOne({
      userId,
      status: 'rejected'
    }).sort({ reviewedAt: -1 });

    if (lastRejected) {
      const daysSinceRejection = (Date.now() - lastRejected.reviewedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceRejection < 7) {
        return res.status(429).json({
          error: 'Please wait before resubmitting after rejection',
          code: 'COOLDOWN_PERIOD',
          waitDays: Math.ceil(7 - daysSinceRejection),
          retryAfter: new Date(lastRejected.reviewedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    }

    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadPhotoVerificationImage(photoData, userId);
    } catch (cloudinaryErr) {
      console.error('[Cloudinary] Upload failed:', cloudinaryErr.message);
      return res.status(500).json({
        error: 'Failed to upload photo. Please try again.',
        code: 'CLOUDINARY_UPLOAD_FAILED'
      });
    }

    // Create photo verification record
    const photoVerification = new PhotoVerification({
      userId,
      photoUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      status: 'pending',
      submittedAt: new Date(),
      metadata: {
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        size: cloudinaryResult.size
      }
    });

    await photoVerification.save();

    console.log('[PhotoVerification] Photo submitted by user:', userId, 'Public ID:', cloudinaryResult.public_id);

    res.status(201).json({
      success: true,
      message: 'Photo submitted for verification. Review typically takes 24-48 hours.',
      verificationId: photoVerification._id,
      status: 'pending',
      estimatedWaitTime: '24-48 hours',
      submittedAt: photoVerification.submittedAt
    });

  } catch (err) {
    console.error('[ERROR] upload-photo:', err);
    res.status(500).json({ 
      error: 'Failed to upload photo',
      code: 'UPLOAD_ERROR'
    });
  }
});

/**
 * GET /api/verification/photo-status/:userId
 * Get photo verification status
 */
router.get('/photo-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      isPhotoVerified: user.isPhotoVerified || false,
      photoVerifiedAt: user.photoVerifiedAt || null,
      status: user.isPhotoVerified ? 'approved' : 'not_submitted'
    });

  } catch (err) {
    console.error('[ERROR] photo-status:', err);
    res.status(500).json({ 
      error: 'Failed to get photo status',
      code: 'STATUS_ERROR'
    });
  }
});

/**
 * GET /api/verification/pending-reviews
 * Get list of pending photo verifications (Admin only)
 */
router.get('/pending-reviews', authMiddleware, async (req, res) => {
  try {
    // TODO: Add admin role check middleware

    const pending = await PhotoVerification.find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .limit(50)
      .select('-metadata');

    const stats = {
      pending: await PhotoVerification.countDocuments({ status: 'pending' }),
      approved: await PhotoVerification.countDocuments({ status: 'approved' }),
      rejected: await PhotoVerification.countDocuments({ status: 'rejected' })
    };

    // Calculate average review time
    const reviewed = await PhotoVerification.find({
      status: { $in: ['approved', 'rejected'] },
      reviewedAt: { $exists: true }
    });

    const avgReviewTime = reviewed.length > 0
      ? reviewed.reduce((sum, v) => sum + (v.reviewedAt - v.submittedAt), 0) / reviewed.length / (1000 * 60 * 60)
      : 0;

    res.json({
      stats: {
        ...stats,
        averageReviewTimeHours: Math.round(avgReviewTime * 10) / 10
      },
      verifications: pending
    });

  } catch (err) {
    console.error('[ERROR] pending-reviews:', err);
    res.status(500).json({
      error: 'Failed to fetch pending reviews',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/verification/review/:verificationId
 * Review and approve/reject a photo verification
 */
router.put('/review/:verificationId', authMiddleware, async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { decision, reason, notes } = req.body;
    const moderatorId = req.userId;

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        error: 'Valid decision required (approve or reject)',
        code: 'INVALID_DECISION'
      });
    }

    const verification = await PhotoVerification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        error: 'Verification not found',
        code: 'NOT_FOUND'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(409).json({
        error: 'Only pending verifications can be reviewed',
        code: 'INVALID_STATUS',
        currentStatus: verification.status
      });
    }

    // Update verification record
    verification.status = decision === 'approve' ? 'approved' : 'rejected';
    verification.reviewedAt = new Date();
    verification.reviewedBy = moderatorId;
    if (reason) verification.reason = reason;
    if (notes) verification.notes = notes;

    await verification.save();

    // Update user record if approved
    if (decision === 'approve') {
      await User.updateOne(
        { id: verification.userId },
        {
          isPhotoVerified: true,
          photoVerifiedAt: new Date()
        }
      );

      console.log('[PhotoVerification] Approved by:', moderatorId, 'User:', verification.userId);
    } else {
      console.log('[PhotoVerification] Rejected by:', moderatorId, 'User:', verification.userId, 'Reason:', reason);

      // Delete from Cloudinary if rejecting
      if (verification.publicId) {
        try {
          await deleteVerificationPhoto(verification.publicId);
        } catch (cloudinaryErr) {
          console.error('[Cloudinary] Failed to delete photo:', verification.publicId, cloudinaryErr.message);
          // Don't fail the response, just log the error
        }
      }
    }

    res.json({
      success: true,
      message: `Photo ${decision === 'approve' ? 'approved' : 'rejected'} successfully`,
      verification: {
        _id: verification._id,
        status: verification.status,
        reviewedAt: verification.reviewedAt,
        reason: verification.reason
      }
    });

  } catch (err) {
    console.error('[ERROR] review:', err);
    res.status(500).json({
      error: 'Failed to process review',
      code: 'REVIEW_ERROR'
    });
  }
});

export default router;
