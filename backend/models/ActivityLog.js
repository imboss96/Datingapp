import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  action: { 
    type: String, 
    enum: ['signup', 'payment_change', 'moderator_action', 'ban', 'warn', 'login', 'logout', 'profile_update', 'role_change', 'email_verification', 'photo_verification'],
    required: true 
  },
  userId: { type: String, index: true },
  moderatorId: { type: String }, // For moderator-initiated actions
  description: { type: String, required: true },
  details: { type: String }, // Additional details about the action
  metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible field for action-specific data
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { 
    type: String, 
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  }
});

// Index for querying recent logs
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
