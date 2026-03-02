import ActivityLog from '../models/ActivityLog.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log an activity to the ActivityLog collection with enhanced structure
 */
export async function logActivity({
  action,
  actor = {},
  userId,
  moderatorId = null,
  target = {},
  description,
  details = null,
  reason = null,
  metadata = {},
  financial = null,
  ipAddress = null,
  userAgent = null,
  status = 'success'
}) {
  try {
    const logEntry = new ActivityLog({
      id: uuidv4(),
      action,
      actor: {
        userId: actor.userId || moderatorId || userId,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      userId, // Legacy field
      moderatorId, // Legacy field
      target,
      description,
      details,
      reason,
      metadata: { ...metadata },
      financial: financial ? { ...financial } : undefined,
      ipAddress,
      userAgent,
      status,
      timestamp: new Date()
    });

    const savedLog = await logEntry.save();
    console.log(`[ACTIVITY LOG] ${action.toUpperCase()} | Actor: ${actor.userId || moderatorId || userId || 'SYSTEM'} | Status: ${status}`);
    return savedLog;
  } catch (error) {
    console.error('[ACTIVITY LOG ERROR] Failed to log activity:', error.message);
    return null;
  }
}

// ==================== CHAT MODERATION ====================

export async function logChatFlagged(chatId, userId, reason, moderatorId, actor = {}) {
  return logActivity({
    action: 'chat_flagged',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    moderatorId,
    target: { type: 'chat', id: chatId },
    description: `Chat flagged as inappropriate`,
    reason,
    metadata: { originalUserId: userId, reason }
  });
}

export async function logChatUnflagged(chatId, moderatorId, reason = '', actor = {}) {
  return logActivity({
    action: 'chat_unflagged',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    moderatorId,
    target: { type: 'chat', id: chatId },
    description: `Chat unflagged/cleared`,
    reason
  });
}

export async function logChatResolved(chatId, moderatorId, actor = {}) {
  return logActivity({
    action: 'chat_resolved',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    moderatorId,
    target: { type: 'chat', id: chatId },
    description: `Chat marked as resolved`
  });
}

export async function logChatReassigned(chatId, fromModeratorId, toModeratorId, actor = {}) {
  return logActivity({
    action: 'chat_reassigned',
    actor: { ...actor, userId: actor.userId || toModeratorId, role: 'admin' },
    target: { type: 'chat', id: chatId },
    description: `Chat reassigned from one moderator to another`,
    metadata: { fromModeratorId, toModeratorId }
  });
}

export async function logMessageRemoved(chatId, messageId, reason, moderatorId, actor = {}) {
  return logActivity({
    action: 'message_removed',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    moderatorId,
    target: { type: 'chat', id: chatId },
    description: `Message removed from chat`,
    reason,
    metadata: { messageId, reason }
  });
}

export async function logUserWarnedInChat(chatId, userId, reason, moderatorId, actor = {}) {
  return logActivity({
    action: 'user_warned_in_chat',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    userId,
    moderatorId,
    target: { type: 'user', id: userId },
    description: `User warned in chat`,
    reason,
    metadata: { chatId, reason }
  });
}

// ==================== MODERATOR ACTIVITY ====================

export async function logModeratorAssigned(chatId, moderatorId, assignedBy, actor = {}) {
  return logActivity({
    action: 'moderator_assigned',
    actor: { ...actor, userId: assignedBy, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Moderator assigned to chat`,
    metadata: { chatId, moderatorId, assignedBy }
  });
}

export async function logModeratorReplied(chatId, moderatorId, amountEarned = 0.50, actor = {}) {
  return logActivity({
    action: 'moderator_replied',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    target: { type: 'chat', id: chatId },
    description: `Moderator replied to chat`,
    financial: { amount: amountEarned, currency: 'USD' },
    metadata: { chatId, moderatorId, earnedAmount: amountEarned }
  });
}

export async function logModeratorJoined(moderatorId, joinDate, actor = {}) {
  return logActivity({
    action: 'moderator_joined',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    target: { type: 'moderator', id: moderatorId },
    description: `New moderator joined the platform`,
    metadata: { moderatorId, joinDate }
  });
}

export async function logModeratorLeft(moderatorId, reason = '', actor = {}) {
  return logActivity({
    action: 'moderator_left',
    actor: { ...actor, userId: moderatorId, role: 'moderator' },
    target: { type: 'moderator', id: moderatorId },
    description: `Moderator left the platform`,
    reason,
    metadata: { moderatorId, reason }
  });
}

export async function logModeratorStatusChanged(moderatorId, oldStatus, newStatus, actor = {}) {
  return logActivity({
    action: 'moderator_status_changed',
    actor: { ...actor, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Moderator status changed from ${oldStatus} to ${newStatus}`,
    metadata: { moderatorId, oldStatus, newStatus }
  });
}

// ==================== PAYMENTS & EARNINGS ====================

export async function logEarningRecorded(moderatorId, chatId, amount = 0.50, actor = {}) {
  return logActivity({
    action: 'earning_recorded',
    actor: { ...actor, userId: moderatorId, role: 'system' },
    target: { type: 'moderator', id: moderatorId },
    description: `Earning recorded for completed chat`,
    financial: { amount, currency: 'USD' },
    metadata: { moderatorId, chatId, amount }
  });
}

export async function logEarningApproved(moderatorId, earningId, amount, actor = {}) {
  return logActivity({
    action: 'earning_approved',
    actor: { ...actor, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Earning approved for payment`,
    financial: { amount, currency: 'USD' },
    metadata: { moderatorId, earningId, amount }
  });
}

export async function logEarningDisputed(moderatorId, earningId, reason, actor = {}) {
  return logActivity({
    action: 'earning_disputed',
    actor: { ...actor, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Earning marked as disputed`,
    reason,
    metadata: { moderatorId, earningId, reason },
    status: 'pending'
  });
}

export async function logPaymentProcessed(moderatorId, amount, paymentMethod, transactionId, earningIds = [], actor = {}) {
  return logActivity({
    action: 'payment_processed',
    actor: { ...actor, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Payment processed to moderator via ${paymentMethod}`,
    financial: { amount, currency: 'USD', transactionId },
    metadata: { moderatorId, amount, paymentMethod, transactionId, earningIds }
  });
}

export async function logPaymentStatusChanged(moderatorId, oldStatus, newStatus, amount, actor = {}) {
  return logActivity({
    action: 'payment_status_changed',
    actor: { ...actor, role: 'admin' },
    target: { type: 'moderator', id: moderatorId },
    description: `Payment status changed from ${oldStatus} to ${newStatus}`,
    financial: { amount, currency: 'USD' },
    metadata: { moderatorId, oldStatus, newStatus, amount }
  });
}

// ==================== USER MANAGEMENT ====================

export async function logUserSuspended(userId, reason, duration, moderatorId, actor = {}) {
  return logActivity({
    action: 'user_suspended',
    actor: { ...actor, userId: moderatorId, role: 'admin' },
    userId,
    target: { type: 'user', id: userId },
    description: `User suspended (${duration})`,
    reason,
    metadata: { reason, duration, suspendedBy: moderatorId }
  });
}

export async function logUserUnsuspended(userId, moderatorId, actor = {}) {
  return logActivity({
    action: 'user_unsuspended',
    actor: { ...actor, userId: moderatorId, role: 'admin' },
    userId,
    target: { type: 'user', id: userId },
    description: `User suspension lifted`,
    metadata: { unsuspendedBy: moderatorId }
  });
}

export async function logUserVerified(userId, verificationType, actor = {}) {
  return logActivity({
    action: 'user_verified',
    actor: { ...actor, userId, role: 'system' },
    userId,
    target: { type: 'user', id: userId },
    description: `User verified (${verificationType})`,
    metadata: { verificationType }
  });
}

export async function logUserProfileUpdated(userId, changedFields, moderatorId = null, actor = {}) {
  return logActivity({
    action: 'user_profile_updated',
    actor: { ...actor, userId: moderatorId || userId, role: moderatorId ? 'admin' : 'user' },
    userId,
    target: { type: 'user', id: userId },
    description: `User profile updated${moderatorId ? ' by moderator' : ''}`,
    details: Array.isArray(changedFields) ? changedFields.join(', ') : changedFields,
    metadata: { changedFields }
  });
}

export async function logUserAccountDeleted(userId, reason = '', moderatorId = null, actor = {}) {
  return logActivity({
    action: 'user_account_deleted',
    actor: { ...actor, userId: moderatorId || userId, role: moderatorId ? 'admin' : 'user' },
    userId,
    target: { type: 'user', id: userId },
    description: `User account deleted${moderatorId ? ' by admin' : ''}`,
    reason,
    metadata: { reason, deletedBy: moderatorId || userId }
  });
}

// ==================== REPORTS ====================

export async function logReportSubmitted(reportId, reportedUserId, reportingUserId, reason, actor = {}) {
  return logActivity({
    action: 'report_submitted',
    actor: { ...actor, userId: reportingUserId, role: 'user' },
    userId: reportingUserId,
    target: { type: 'user', id: reportedUserId },
    description: `Report submitted against user`,
    reason,
    metadata: { reportId, reportedUserId, reportingUserId, reason }
  });
}

export async function logReportResolved(reportId, reportedUserId, actionTaken, moderatorId, actor = {}) {
  return logActivity({
    action: 'report_resolved',
    actor: { ...actor, userId: moderatorId, role: 'admin' },
    target: { type: 'user', id: reportedUserId },
    description: `Report resolved - Action taken: ${actionTaken}`,
    metadata: { reportId, reportedUserId, actionTaken, resolvedBy: moderatorId }
  });
}

export async function logReportDismissed(reportId, reportedUserId, reason, moderatorId, actor = {}) {
  return logActivity({
    action: 'report_dismissed',
    actor: { ...actor, userId: moderatorId, role: 'admin' },
    target: { type: 'user', id: reportedUserId },
    description: `Report dismissed`,
    reason,
    metadata: { reportId, reportedUserId, reason, dismissedBy: moderatorId }
  });
}

// ==================== ADMIN & SYSTEM ====================

export async function logAdminLogin(adminId, actor = {}) {
  return logActivity({
    action: 'admin_login',
    actor: { ...actor, userId: adminId, role: 'admin' },
    target: { type: 'admin', id: adminId },
    description: `Admin logged in`
  });
}

export async function logAdminLogout(adminId, actor = {}) {
  return logActivity({
    action: 'admin_logout',
    actor: { ...actor, userId: adminId, role: 'admin' },
    target: { type: 'admin', id: adminId },
    description: `Admin logged out`
  });
}

export async function logConfigUpdated(configSection, changes, adminId, actor = {}) {
  return logActivity({
    action: 'config_updated',
    actor: { ...actor, userId: adminId, role: 'admin' },
    description: `System configuration updated (${configSection})`,
    details: Object.keys(changes).join(', '),
    metadata: { configSection, changes, updatedBy: adminId }
  });
}

export async function logCoinPackageCreated(packageId, coins, price, adminId, actor = {}) {
  return logActivity({
    action: 'coin_package_created',
    actor: { ...actor, userId: adminId, role: 'admin' },
    target: { type: 'config', id: packageId },
    description: `New coin package created: ${coins} coins for $${price}`,
    financial: { coins, price },
    metadata: { packageId, coins, price, createdBy: adminId }
  });
}

export async function logCoinPackageUpdated(packageId, oldCoins, newCoins, oldPrice, newPrice, adminId, actor = {}) {
  return logActivity({
    action: 'coin_package_updated',
    actor: { ...actor, userId: adminId, role: 'admin' },
    target: { type: 'config', id: packageId },
    description: `Coin package updated from ${oldCoins} coins/$${oldPrice} to ${newCoins} coins/$${newPrice}`,
    financial: { coins: newCoins, price: newPrice },
    metadata: { packageId, oldCoins, newCoins, oldPrice, newPrice, updatedBy: adminId }
  });
}

export async function logCoinPackageDeleted(packageId, coins, price, adminId, actor = {}) {
  return logActivity({
    action: 'coin_package_deleted',
    actor: { ...actor, userId: adminId, role: 'admin' },
    target: { type: 'config', id: packageId },
    description: `Coin package deleted: ${coins} coins for $${price}`,
    financial: { coins, price },
    metadata: { packageId, coins, price, deletedBy: adminId }
  });
}

// ==================== LEGACY FUNCTIONS ====================

export async function logLogin(userId, req = {}) {
  return logActivity({
    action: 'login',
    userId,
    description: `User logged in`,
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown'
  });
}

export async function logLogout(userId, req = {}) {
  return logActivity({
    action: 'logout',
    userId,
    description: `User logged out`,
    ipAddress: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown'
  });
}

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

export async function logProfileUpdate(userId, changes = {}, moderatorId = null) {
  return logActivity({
    action: 'user_profile_updated',
    userId,
    moderatorId,
    description: `User profile updated${moderatorId ? ' by moderator' : ''}`,
    details: Object.keys(changes).join(', '),
    metadata: changes
  });
}

export async function logEmailVerification(userId, email) {
  return logActivity({
    action: 'email_verification',
    userId,
    description: `Email verified`,
    details: email,
    metadata: { email }
  });
}

export async function logPhotoVerification(userId, photoId, verified = true) {
  return logActivity({
    action: 'photo_verification',
    userId,
    description: `Photo ${verified ? 'verified' : 'rejected'}`,
    metadata: { photoId, verified }
  });
}

export async function logPaymentChange(userId, details = {}) {
  return logActivity({
    action: 'payment_change',
    userId,
    description: `Payment/transaction processed`,
    details: details.type || 'payment',
    metadata: details
  });
}

export async function logRoleChange(userId, oldRole, newRole, moderatorId) {
  return logActivity({
    action: 'role_change',
    userId,
    moderatorId,
    description: `User role changed from ${oldRole} to ${newRole}`,
    metadata: { oldRole, newRole }
  });
}

export async function logBan(userId, reason = '', duration = 'permanent', moderatorId) {
  return logActivity({
    action: 'user_suspended',
    userId,
    moderatorId,
    description: `User banned (${duration})${reason ? `: ${reason}` : ''}`,
    reason,
    metadata: { reason, duration, moderatorId }
  });
}

export async function logWarn(userId, reason = '', moderatorId) {
  return logActivity({
    action: 'user_warned_in_chat',
    userId,
    moderatorId,
    description: `User warned${reason ? `: ${reason}` : ''}`,
    reason,
    metadata: { reason, moderatorId }
  });
}

export async function logModeratorAction(userId, actionType, chatId, details = '', moderatorId) {
  return logActivity({
    action: 'moderator_replied',
    userId,
    moderatorId,
    description: `Moderator ${actionType} for chat ID: ${chatId}${details ? ` - ${details}` : ''}`,
    metadata: { actionType, chatId, moderatorId }
  });
}

export default { 
  logActivity,
  logChatFlagged,
  logChatUnflagged,
  logChatResolved,
  logChatReassigned,
  logMessageRemoved,
  logUserWarnedInChat,
  logModeratorAssigned,
  logModeratorReplied,
  logModeratorJoined,
  logModeratorLeft,
  logModeratorStatusChanged,
  logEarningRecorded,
  logEarningApproved,
  logEarningDisputed,
  logPaymentProcessed,
  logPaymentStatusChanged,
  logUserSuspended,
  logUserUnsuspended,
  logUserVerified,
  logUserProfileUpdated,
  logUserAccountDeleted,
  logReportSubmitted,
  logReportResolved,
  logReportDismissed,
  logAdminLogin,
  logAdminLogout,
  logConfigUpdated,
  logCoinPackageCreated,
  logCoinPackageUpdated,
  logCoinPackageDeleted,
  logLogin,
  logLogout,
  logSignup,
  logProfileUpdate,
  logEmailVerification,
  logPhotoVerification,
  logPaymentChange,
  logRoleChange,
  logBan,
  logWarn,
  logModeratorAction
};
