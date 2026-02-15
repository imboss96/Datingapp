import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    // Automatically delete documents after expiry (TTL index in seconds)
    expires: 600
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  userId: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to allow efficient lookup
emailVerificationSchema.index({ email: 1, verified: 1 });

const EmailVerification = mongoose.models.EmailVerification || mongoose.model('EmailVerification', emailVerificationSchema);

export default EmailVerification;
