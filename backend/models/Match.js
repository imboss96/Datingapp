import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true, index: true },
  user1Id: { type: String, required: true, index: true },
  user2Id: { type: String, required: true, index: true },
  user1Name: { type: String },
  user2Name: { type: String },
  user1Image: { type: String },
  user2Image: { type: String },
  interestMatch: { type: Number, default: 0 }, // 0-100 percentage
  ageMatch: { type: Number, default: 0 },      // compatibility score
  distanceMatch: { type: Number, default: 0 }, // km apart
  createdAt: { type: Date, default: Date.now, index: true },
  lastInteractedAt: { type: Date, default: Date.now },
  mutualInterests: [{ type: String }],
  notified: { type: Boolean, default: false }, // whether both users were notified
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
