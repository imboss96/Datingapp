import ActivityLog from '../models/ActivityLog.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log an activity to the ActivityLog collection
 * @param {Object} options - Logging options
 * @param {string} options.action - Type of action (signup, login, moderator_action, etc.)
 * @param {string} options.userId - User ID associated with the action
 * @param {string} [options.moderatorId] - Moderator ID if action was initiated by a moderator
 * @param {string} options.description - Human-readable description of the action
 * @param {string} [options.details] - Additional details about the action
 * @param {Object} [options.metadata] - Action-specific metadata
 * @param {string} [options.ipAddress] - User's IP address
 * @param {string} [options.userAgent] - User's browser/device info
 * @param {string} [options.status='success'] - Status of the action (success, failure, pending)
 * @returns {Promise<Object>} - The created activity log entry
 */
export async function logActivity({
  action,
  userId,
  moderatorId = null,
  description,
  details = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  status = 'success'
}) {
  try {
    const logEntry = new ActivityLog({
      id: uuidv4(),
      action,
      userId,
      moderatorId,
      description,
      details,
      metadata,
      ipAddress,
      userAgent,
      status,
      timestamp: new Date()
    });

    const savedLog = await logEntry.save();
    console.log(`[ACTIVITY LOG] ${action.toUpperCase()} | User: ${userId} | Status: ${status}`);
    return savedLog;
  } catch (error) {
    console.error('[ACTIVITY LOG ERROR] Failed to log activity:', error.message);
    // Don't throw - logging shouldn't break the main application flow
    return null;
  }
}

/**
 * Log a login event
 */
export async function logLogin(userId, req = {}) {
  return logActivity({
    action: 'login',
    userId,
    description: `User logged in`,
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown'
  });
}

/**
 * Log a logout event
 */
export async function logLogout(userId, req = {}) {
  return logActivity({
    action: 'logout',
    userId,
    description: `User logged out`,
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown'
  });
}

/**
 * Log a signup event
 */
export async function logSignup(userId, email, accountType = 'APP', req = {}) {
  return logActivity({
    action: 'signup',
    userId,
    description: `New user signed up (${accountType} account)`,
    details: `Email: ${email}`,
    metadata: { email, accountType },
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown'
  });
}

/**
 * Log a profile update
 */
export async function logProfileUpdate(userId, changes = {}, moderatorId = null) {
  return logActivity({
    action: 'profile_update',
    userId,
    moderatorId,
    description: `User profile updated${moderatorId ? ' by moderator' : ''}`,
    details: Object.keys(changes).join(', '),
    metadata: changes
  });
}

/**
 * Log an email verification
 */
export async function logEmailVerification(userId, email) {
  return logActivity({
    action: 'email_verification',
    userId,
    description: `Email verified`,
    details: email,
    metadata: { email }
  });
}

/**
 * Log a photo verification
 */
export async function logPhotoVerification(userId, photoId, verified = true) {
  return logActivity({
    action: 'photo_verification',
    userId,
    description: `Photo ${verified ? 'verified' : 'rejected'}`,
    metadata: { photoId, verified }
  });
}

/**
 * Log a payment/transaction
 */
export async function logPaymentChange(userId, details = {}) {
  return logActivity({
    action: 'payment_change',
    userId,
    description: `Payment/transaction processed`,
    details: details.type || 'payment',
    metadata: details
  });
}

/**
 * Log a role change (admin, moderator, user)
 */
export async function logRoleChange(userId, oldRole, newRole, moderatorId) {
  return logActivity({
    action: 'role_change',
    userId,
    moderatorId,
    description: `User role changed from ${oldRole} to ${newRole}`,
    metadata: { oldRole, newRole }
  });
}

/**
 * Log a user ban
 */
export async function logBan(userId, reason = '', duration = 'permanent', moderatorId) {
  return logActivity({
    action: 'ban',
    userId,
    moderatorId,
    description: `User banned (${duration})${reason ? `: ${reason}` : ''}`,
    metadata: { reason, duration, moderatorId }
  });
}

/**
 * Log a user warning
 */
export async function logWarn(userId, reason = '', moderatorId) {
  return logActivity({
    action: 'warn',
    userId,
    moderatorId,
    description: `User warned${reason ? `: ${reason}` : ''}`,
    metadata: { reason, moderatorId }
  });
}

/**
 * Log a moderator action (chat replied, chat resolved, etc.)
 */
export async function logModeratorAction(userId, actionType, chatId, details = '', moderatorId) {
  return logActivity({
    action: 'moderator_action',
    userId,
    moderatorId,
    description: `Moderator ${actionType} for chat ID: ${chatId}${details ? ` - ${details}` : ''}`,
    metadata: { actionType, chatId, moderatorId }
  });
}

export default { logActivity, logLogin, logLogout, logSignup, logProfileUpdate, logEmailVerification, logPhotoVerification, logPaymentChange, logRoleChange, logBan, logWarn, logModeratorAction };
