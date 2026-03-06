import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
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
    paymentMethodId: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'declined', 'refunded'],
      default: 'pending',
      index: true
    },
    transactionType: {
      type: String,
      enum: ['payout', 'deposit', 'refund', 'adjustment'],
      default: 'payout',
      index: true
    },
    description: {
      type: String,
      default: 'Moderation earnings'
    },
    reference: {
      type: String,
      default: null,
      index: true
    },
    // External transaction ID (from payment gateway)
    externalTransactionId: {
      type: String,
      default: null,
      index: true
    },
    // Fee charged by payment processor
    processingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0
    },
    // Metadata for payment details
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Error information if transaction failed
    errorMessage: {
      type: String,
      default: null
    },
    errorCode: {
      type: String,
      default: null
    },
    // Timestamps for transaction lifecycle
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true
    },
    // Event log for transaction history
    events: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        notes: String
      }
    ],
    // Audit trail
    createdBy: {
      type: String,
      default: 'system'
    }
  },
  { timestamps: true }
);

// Index for finding transactions by moderator and date range
paymentTransactionSchema.index({ moderatorId: 1, createdAt: -1 });
paymentTransactionSchema.index({ moderatorId: 1, status: 1 });
paymentTransactionSchema.index({ createdAt: -1 });

// Virtual for display
paymentTransactionSchema.virtual('displayAmount').get(function () {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Method to add event to transaction
paymentTransactionSchema.methods.addEvent = function (status, notes) {
  this.events.push({
    status,
    notes,
    timestamp: new Date()
  });
  return this.save();
};

// Export
export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
