/**
 * Email Automation Functions
 * High-level email functions for the dating app
 */

import {
  sendTransactionalEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendCoinPurchaseEmail,
  sendPremiumUpgradeEmail,
  sendPaymentConfirmationEmail,
  subscribeToNewsletter
} from './brevoService.js';

/**
 * Send password reset email
 */
export const sendPasswordResetEmailAutomation = async (email, resetToken) => {
  try {
    console.log('[EmailAutomation] Sending password reset email to:', email);
    const result = await sendPasswordResetEmail(email, resetToken);

    if (result.success) {
      console.log('[EmailAutomation] Password reset email sent successfully');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send password reset email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in password reset email automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmailAutomation = async (email, name) => {
  try {
    console.log('[EmailAutomation] Sending welcome email to:', email, 'Name:', name);
    const result = await sendWelcomeEmail(email, name);

    if (result.success) {
      console.log('[EmailAutomation] Welcome email sent successfully');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send welcome email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in welcome email automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email verification
 */
export const sendEmailVerificationAutomation = async (email, verificationToken) => {
  try {
    console.log('[EmailAutomation] Sending email verification to:', email);
    const result = await sendEmailVerificationEmail(email, verificationToken);

    if (result.success) {
      console.log('[EmailAutomation] Email verification sent successfully');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send email verification:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in email verification automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send coin purchase confirmation email
 */
export const sendCoinPurchaseEmailAutomation = async (email, userName, coins, price, transactionId) => {
  try {
    console.log('[EmailAutomation] Sending coin purchase email to:', email, 'Coins:', coins);
    const result = await sendCoinPurchaseEmail(email, userName, coins, price, transactionId);

    if (result.success) {
      console.log('[EmailAutomation] Coin purchase email sent successfully - Message ID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send coin purchase email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in coin purchase email automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send premium membership upgrade confirmation email
 */
export const sendPremiumUpgradeEmailAutomation = async (email, userName, planDuration, price) => {
  try {
    console.log('[EmailAutomation] Sending premium upgrade email to:', email, 'Plan:', planDuration);
    const result = await sendPremiumUpgradeEmail(email, userName, planDuration, price);

    if (result.success) {
      console.log('[EmailAutomation] Premium upgrade email sent successfully - Message ID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send premium upgrade email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in premium upgrade email automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Register user for newsletter
 */
export const registerForNewsletterAutomation = async (email, firstName = '', lastName = '') => {
  try {
    console.log('[EmailAutomation] Registering for newsletter:', email);
    const result = await subscribeToNewsletter(email, firstName, lastName);

    if (result.success) {
      console.log('[EmailAutomation] Newsletter registration successful');
      return { success: true, contactId: result.contactId };
    } else {
      console.error('[EmailAutomation] Failed to register for newsletter:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in newsletter registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send custom transactional email
 */
export const sendCustomTransactionalEmail = async (email, subject, htmlContent, textContent = null) => {
  try {
    console.log('[EmailAutomation] Sending custom transactional email to:', email);
    const result = await sendTransactionalEmail({
      email,
      subject,
      htmlContent,
      textContent
    });

    if (result.success) {
      console.log('[EmailAutomation] Custom email sent successfully');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[EmailAutomation] Failed to send custom email:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[EmailAutomation] Error in custom email automation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send the shared payment confirmation email.
 */
export const sendPaymentConfirmationEmailAutomation = async (paymentData) => {
  try {
    console.log('[EmailAutomation] Sending shared payment confirmation email to:', paymentData.email);
    const result = await sendPaymentConfirmationEmail(paymentData);

    if (result.success) {
      console.log('[EmailAutomation] Shared payment confirmation email sent successfully');
      return { success: true, messageId: result.messageId };
    }

    console.error('[EmailAutomation] Failed to send shared payment confirmation email:', result.error);
    return { success: false, error: result.error };
  } catch (error) {
    console.error('[EmailAutomation] Error in shared payment confirmation automation:', error);
    return { success: false, error: error.message };
  }
};
