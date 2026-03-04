/**
 * Payment Helper Utility
 * Centralizes payment completion logic and email sending for all payment methods
 */

import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import CoinPackage from '../models/CoinPackage.js';
import { sendCoinPurchaseEmail, sendPremiumUpgradeEmail } from './email.js';

/**
 * Complete a payment and send confirmation email
 * Works with ANY payment method (stripe, paypal, apple_pay, google_pay, lipana, crypto, bank_transfer)
 */
export async function completePaymentWithEmail(paymentData) {
  const { userId, packageId, method, transactionId, amount, price } = paymentData;

  try {
    console.log(`[PaymentHelper] ▶ Processing payment completion`);
    console.log(`  User: ${userId}`);
    console.log(`  Package: ${packageId}`);
    console.log(`  Method: ${method}`);
    console.log(`  Transaction: ${transactionId}`);

    // Look up user
    console.log(`[PaymentHelper] ▶ Looking up user...`);
    const user = await User.findOne({ _id: userId });

    if (!user) {
      console.error(`[PaymentHelper] ✗ User not found: ${userId}`);
      return { success: false, error: 'User not found' };
    }

    console.log(`[PaymentHelper] ✓ User found: ${user.name} (${user.email})`);

    // Look up package
    console.log(`[PaymentHelper] ▶ Looking up package info...`);
    let pkg = await CoinPackage.findOne({ packageId });
    
    if (!pkg) {
      // Fall back to PACKAGES map
      const PACKAGES = {
        coins_50: { coins: 50, price: '$4.99' },
        coins_100: { coins: 100, price: '$9.99' },
        coins_250: { coins: 250, price: '$19.99' },
        coins_500: { coins: 500, price: '$29.99' },
        premium_1m: { isPremium: true, price: '$4.99' },
        premium_3m: { isPremium: true, price: '$12.99' },
        premium_6m: { isPremium: true, price: '$19.99' },
        premium_12m: { isPremium: true, price: '$29.99' }
      };
      pkg = PACKAGES[packageId];
    }

    if (!pkg) {
      console.error(`[PaymentHelper] ✗ Package not found: ${packageId}`);
      return { success: false, error: 'Package not found' };
    }

    console.log(`[PaymentHelper] ✓ Package found`);

    // Update user profile
    console.log(`[PaymentHelper] ▶ Updating user profile...`);
    if (pkg.isPremium) {
      user.isPremium = true;
      console.log(`[PaymentHelper] ✓ User upgraded to premium`);
    } else {
      const oldCoins = user.coins || 0;
      user.coins = oldCoins + pkg.coins;
      console.log(`[PaymentHelper] ✓ User coins updated: ${oldCoins} → ${user.coins}`);
    }

    await user.save();
    console.log(`[PaymentHelper] ✓ User profile saved to database`);

    // Mark transaction as completed
    console.log(`[PaymentHelper] ▶ Updating transaction status...`);
    if (transactionId) {
      const tx = await Transaction.findOne({ id: transactionId });
      if (tx) {
        tx.status = 'COMPLETED';
        await tx.save();
        console.log(`[PaymentHelper] ✓ Transaction marked as COMPLETED`);
      }
    }

    // Send confirmation email
    console.log(`[PaymentHelper] ▶ Sending confirmation email...`);
    let emailResult;

    if (pkg.isPremium) {
      // Premium upgrade email
      const planDuration = extractPlanDuration(packageId);
      emailResult = await sendPremiumUpgradeEmail(user.email, user.name, planDuration, pkg.price);
      
      if (emailResult.success) {
        console.log(`[PaymentHelper] ✓ Premium upgrade email sent`);
        console.log(`    - Message ID: ${emailResult.messageId}`);
      } else {
        console.error(`[PaymentHelper] ✗ Premium email failed:`, emailResult.error);
      }
    } else {
      // Coin purchase email
      emailResult = await sendCoinPurchaseEmail(user.email, user.name, pkg.coins, pkg.price, transactionId);
      
      if (emailResult.success) {
        console.log(`[PaymentHelper] ✓ Coin purchase email sent`);
        console.log(`    - Coins: ${pkg.coins}`);
        console.log(`    - Message ID: ${emailResult.messageId}`);
      } else {
        console.error(`[PaymentHelper] ✗ Coin email failed:`, emailResult.error);
      }
    }

    // Return result (don't fail payment if email fails)
    return {
      success: true,
      message: 'Payment completed successfully',
      emailSent: emailResult.success,
      emailMessageId: emailResult.messageId || null,
      emailError: emailResult.success ? null : emailResult.error,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        coins: user.coins,
        isPremium: user.isPremium
      }
    };
  } catch (error) {
    console.error(`[PaymentHelper] ✗ Error completing payment:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract plan duration from package ID
 */
function extractPlanDuration(packageId) {
  const durationMap = {
    'premium_1m': '1 Month',
    'premium_3m': '3 Months',
    'premium_6m': '6 Months',
    'premium_12m': '12 Months'
  };
  return durationMap[packageId] || 'Premium';
}

/**
 * Validate payment data
 */
export function validatePaymentData(data) {
  const { userId, packageId, method } = data;

  const errors = [];
  if (!userId) errors.push('userId is required');
  if (!packageId) errors.push('packageId is required');
  if (!method) errors.push('method is required');

  const validMethods = ['stripe', 'paypal', 'apple_pay', 'google_pay', 'lipana', 'crypto', 'bank_transfer', 'momo', 'card'];
  if (method && !validMethods.includes(method)) {
    errors.push(`method must be one of: ${validMethods.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
