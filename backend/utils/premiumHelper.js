/**
 * Premium utility functions
 * Check if user has active premium and grant unlimited services
 */

/**
 * Check if user has active premium membership
 * @param {Object} user - User document
 * @returns {boolean} true if premium is active, false otherwise
 */
export function isUserPremium(user) {
  if (!user || !user.isPremium) return false;
  
  // If no expiration date set, treat as non-premium
  if (!user.premiumExpiresAt) {
    return false;
  }
  
  // Check if premium has expired
  const now = new Date();
  return new Date(user.premiumExpiresAt) > now;
}

/**
 * Get premium expiration date
 * @param {Object} user - User document
 * @returns {Date|null} Expiration date or null if not premium
 */
export function getPremiumExpiresAt(user) {
  if (isUserPremium(user)) {
    return user.premiumExpiresAt;
  }
  return null;
}

/**
 * Get days remaining on premium
 * @param {Object} user - User document
 * @returns {number} Days remaining, or 0 if not premium
 */
export function getPremiumDaysRemaining(user) {
  if (!isUserPremium(user)) return 0;
  
  const now = new Date();
  const expiresAt = new Date(user.premiumExpiresAt);
  const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
}

/**
 * Upgrade user to premium
 * @param {Object} user - User document
 * @param {string} plan - Premium plan ('1_month', '3_months', '6_months', '12_months')
 * @returns {Object} Updated user object
 */
export function upgradeUserToPremium(user, plan) {
  const durationMap = {
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
  };
  
  const durationDays = durationMap[plan] || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  
  user.isPremium = true;
  user.premiumPlan = plan;
  user.premiumExpiresAt = expiresAt;
  
  return user;
}

/**
 * Remove premium from user if expired
 * @param {Object} user - User document
 * @returns {Object} Updated user object
 */
export function checkAndRemoveExpiredPremium(user) {
  if (isUserPremium(user)) {
    return user; // Still active
  }
  
  if (user.isPremium) {
    // Premium has expired
    user.isPremium = false;
    user.premiumPlan = null;
    user.premiumExpiresAt = null;
  }
  
  return user;
}

/**
 * Calculate premium expiration date from plan
 * @param {string} plan - Premium plan
 * @returns {Date} Expiration date
 */
export function calculatePremiumExpirationDate(plan) {
  const durationMap = {
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
  };
  
  const durationDays = durationMap[plan] || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  
  return expiresAt;
}
