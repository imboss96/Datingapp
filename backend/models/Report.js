import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  reportedId: { type: String, required: true },
  reporterId: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'RESOLVED', 'DISMISSED'], default: 'PENDING' },
  type: { type: String, enum: ['PROFILE', 'CHAT'], required: true },
  targetId: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
