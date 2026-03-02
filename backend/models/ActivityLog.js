import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  
  // Action type - comprehensive categorization
  action: { 
    type: String, 
    enum: [
      // Chat Moderation
      'chat_flagged',
      'chat_unflagged',
      'chat_resolved',
      'chat_reassigned',
      'message_removed',
      'user_warned_in_chat',
      
      // Moderator Activity
      'moderator_assigned',
      'moderator_replied',
      'moderator_joined',
      'moderator_left',
      'moderator_status_changed',
      
      // Payments & Earnings
      'earning_recorded',
      'earning_approved',
      'earning_disputed',
      'payment_processed',
      'payment_status_changed',
      
      // User Management
      'user_suspended',
      'user_unsuspended',
      'user_verified',
      'user_profile_updated',
      'user_account_deleted',
      
      // Reports & Disputes
      'report_submitted',
      'report_resolved',
      'report_dismissed',
      
      // Admin & System
      'admin_login',
      'admin_logout',
      'config_updated',
      'coin_package_created',
      'coin_package_updated',
      'coin_package_deleted',
      
      // Legacy actions
      'signup',
      'payment_change',
      'login',
      'logout',
      'email_verification',
      'photo_verification',
      'role_change'
    ],
    required: true,
    index: true
  },
  
  // Who performed the action
  actor: {
    userId: { type: String, index: true },
    name: String,
    email: String,
    role: String // 'admin', 'moderator', 'system'
  },
  
  // Legacy fields for backward compatibility
  userId: { type: String, index: true },
  moderatorId: { type: String },
  
  // What was affected
  target: {
    type: { type: String, enum: ['user', 'chat', 'moderator', 'operator', 'report', 'payment', 'config'] },
    id: String,
    name: String
  },
  
  // Description & details
  description: { type: String, required: true },
  details: String,
  reason: String, // For actions like suspension, warning, etc.
  
  // Action-specific metadata
  metadata: { 
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Financial tracking (for payment-related actions)
  financial: {
    amount: Number,
    currency: { type: String, default: 'USD' },
    transactionId: String,
    previousAmount: Number,
    newAmount: Number
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true
  },
  
  // Audit trail
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: String,
  userAgent: String,
  
  // For tracking related actions
  relatedActions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ActivityLog' }],
  
  // Category for filtering (derived from action)
  category: { 
    type: String, 
    enum: ['moderation', 'moderators', 'payments', 'users', 'reports', 'admin', 'system'],
    index: true
  }
});

// Middleware to set category based on action
activityLogSchema.pre('save', function(next) {
  if (!this.category) {
    if (this.action.startsWith('chat_') || this.action.includes('warning') || this.action === 'report_submitted') {
      this.category = 'moderation';
    } else if (this.action.startsWith('moderator_') || this.action === 'moderator_joined' || this.action === 'moderator_left') {
      this.category = 'moderators';
    } else if (this.action.includes('earning_') || this.action.includes('payment_')) {
      this.category = 'payments';
    } else if (this.action.includes('user_') || this.action === 'signup' || this.action === 'login' || this.action === 'logout') {
      this.category = 'users';
    } else if (this.action.startsWith('report_')) {
      this.category = 'reports';
    } else if (this.action === 'admin_login' || this.action === 'admin_logout') {
      this.category = 'admin';
    } else {
      this.category = 'system';
    }
  }
  next();
});

// Compound indexes for efficient querying
activityLogSchema.index({ timestamp: -1, category: 1 });
activityLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
activityLogSchema.index({ 'target.id': 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ category: 1, timestamp: -1 });
activityLogSchema.index({ status: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
