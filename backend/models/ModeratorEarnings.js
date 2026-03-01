import mongoose from 'mongoose';

const moderatorEarningsSchema = new mongoose.Schema({
  moderatorId: { type: String, required: true, unique: true, index: true },
  sessionEarnings: { type: Number, default: 0 }, // Earnings since session start (12:00 hrs yesterday)
  totalEarnings: { type: Number, default: 0 }, // Cumulative earnings for the moderator
  dailyEarnings: [{
    date: { type: Date, required: true }, // Date in YYYY-MM-DD format
    amount: { type: Number, required: true }, // Earnings for that day
    chatsModerated: { type: Number, default: 0 }, // Number of chats moderated
    repliesCount: { type: Number, default: 0 } // Number of replies given
  }],
  lastResetAt: { type: Date, default: Date.now }, // Last time session earnings were cleared
  lastEarningsUpdate: { type: Date, default: Date.now }, // Last time earnings were updated
  replyRate: { type: Number, default: 0.10 }, // Amount earned per reply in dollars
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ModeratorEarnings = mongoose.model('ModeratorEarnings', moderatorEarningsSchema);
export default ModeratorEarnings;
