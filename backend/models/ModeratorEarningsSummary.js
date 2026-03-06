import mongoose from 'mongoose';

const dailyEarningsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, default: 0 },
    chatsModerated: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const moderatorEarningsSummarySchema = new mongoose.Schema(
  {
    moderatorId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    moderatorName: {
      type: String,
      default: 'Unknown'
    },
    sessionEarnings: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalReplies: {
      type: Number,
      default: 0
    },
    replyRate: {
      type: Number,
      default: 0
    },
    dailyEarnings: {
      type: [dailyEarningsSchema],
      default: []
    },
    lastReplyAt: {
      type: Date
    },
    lastEarningsUpdate: {
      type: Date
    },
    lastResetAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const ModeratorEarningsSummary = mongoose.model('ModeratorEarningsSummary', moderatorEarningsSummarySchema);
export default ModeratorEarningsSummary;
