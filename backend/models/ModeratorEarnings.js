import mongoose from 'mongoose';

const moderatorEarningsSchema = new mongoose.Schema({
  moderatorId: {
    type: String,
    required: true,
    index: true
  },
  moderatorName: {
    type: String,
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  earnedAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'disputed', 'rejected'],
    default: 'pending'
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: String
  },
  scheduledPayoutDate: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'wallet', 'pending'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  repliedAt: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
moderatorEarningsSchema.index({ moderatorId: 1, status: 1 });
moderatorEarningsSchema.index({ createdAt: -1 });
moderatorEarningsSchema.index({ moderatorId: 1, createdAt: -1 });

const ModeratorEarnings = mongoose.model('ModeratorEarnings', moderatorEarningsSchema);
export default ModeratorEarnings;
