import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    moderatorId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['mpesa', 'card', 'bank_transfer', 'paypal', 'zelle', 'cash', 'payoneer', 'chime', 'cashapp'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    // Encrypted sensitive data
    details: {
      type: String,
      required: true
    },
    // For card type: store last 4 digits for display
    lastFourDigits: {
      type: String,
      default: null
    },
    // For bank transfer: store bank name
    bankName: {
      type: String,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Verification status
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Index for finding default payment method for moderator
paymentMethodSchema.index({ moderatorId: 1, isDefault: 1 });
paymentMethodSchema.index({ moderatorId: 1, isActive: 1 });

// Export
export default mongoose.model('PaymentMethod', paymentMethodSchema);
