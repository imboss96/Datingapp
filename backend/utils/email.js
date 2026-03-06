import {
  sendPasswordResetEmailAutomation,
  sendEmailVerificationAutomation,
  sendCoinPurchaseEmailAutomation,
  sendPremiumUpgradeEmailAutomation,
  sendPaymentConfirmationEmailAutomation,
  sendCustomTransactionalEmail
} from '../../services/email/emailAutomation.js';

// Send custom email (for OTP and other transactional emails)
export async function sendEmail(to, subject, text, html = null) {
  try {
    const result = await sendCustomTransactionalEmail(to, subject, html || text, text);
    if (result.success) {
      console.log('[EMAIL] Custom email sent to:', to, 'Subject:', subject);
      return result;
    } else {
      console.error('[EMAIL ERROR] Failed to send custom email:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send custom email:', error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, resetToken) {
  try {
    const result = await sendPasswordResetEmailAutomation(email, resetToken);
    if (result.success) {
      console.log('[EMAIL] Password reset email sent to:', email, 'Message ID:', result.messageId);
      return result;
    } else {
      console.error('[EMAIL ERROR] Failed to send password reset email:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send password reset email:', error);
    throw error;
  }
}

// Send email verification
export async function sendEmailVerificationEmail(email, verificationToken) {
  try {
    const result = await sendEmailVerificationAutomation(email, verificationToken);
    if (result.success) {
      console.log('[EMAIL] Email verification sent to:', email, 'Message ID:', result.messageId);
      return result;
    } else {
      console.error('[EMAIL ERROR] Failed to send email verification:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send email verification:', error);
    throw error;
  }
}

// Send coin purchase confirmation email
export async function sendCoinPurchaseEmail(email, userName, coins, price, transactionId) {
  try {
    const result = await sendPaymentConfirmationEmailAutomation({
      email,
      userName,
      purchaseType: 'coins',
      packageName: `${coins} Spark Coins`,
      price,
      transactionId,
      method: 'card',
      coins
    });
    if (result.success) {
      console.log('[EMAIL] Coin purchase email sent to:', email, 'Coins:', coins, 'Message ID:', result.messageId);
      return result;
    } else {
      console.error('[EMAIL ERROR] Failed to send coin purchase email:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send coin purchase email:', error);
    throw error;
  }
}

// Send premium membership upgrade confirmation email
export async function sendPremiumUpgradeEmail(email, userName, planDuration, price) {
  try {
    const result = await sendPaymentConfirmationEmailAutomation({
      email,
      userName,
      purchaseType: 'premium',
      packageName: `${planDuration} Premium`,
      price,
      transactionId: null,
      method: 'card',
      coins: 0,
      planDuration
    });
    if (result.success) {
      console.log('[EMAIL] Premium upgrade email sent to:', email, 'Plan:', planDuration, 'Message ID:', result.messageId);
      return result;
    } else {
      console.error('[EMAIL ERROR] Failed to send premium upgrade email:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send premium upgrade email:', error);
    throw error;
  }
}

export async function sendPaymentConfirmationEmail(paymentData) {
  try {
    const result = await sendPaymentConfirmationEmailAutomation(paymentData);
    if (result.success) {
      console.log('[EMAIL] Shared payment confirmation email sent to:', paymentData.email, 'Message ID:', result.messageId);
      return result;
    }

    console.error('[EMAIL ERROR] Failed to send shared payment confirmation email:', result.error);
    throw new Error(result.error);
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send shared payment confirmation email:', error);
    throw error;
  }
}
