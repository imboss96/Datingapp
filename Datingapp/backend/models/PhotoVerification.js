import mongoose from 'mongoose';

const photoVerificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  photoUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String, // Cloudinary public ID for deletion
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reason: {
    type: String // Rejection reason
  },
  reviewedBy: {
    type: String // Admin/Moderator ID
  },
  antiSpoofScore: {
    type: Number, // 0-1 confidence that it's a real face
    default: null
  },
  notes: {
    type: String // Moderator review notes
  }
});

// Calculate days pending
photoVerificationSchema.virtual('daysPending').get(function() {
  return Math.floor((Date.now() - this.submittedAt) / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON
photoVerificationSchema.set('toJSON', { virtuals: true });

export default mongoose.model('PhotoVerification', photoVerificationSchema);
