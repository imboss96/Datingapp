import {
  sendPasswordResetEmailAutomation,
  sendEmailVerificationAutomation,
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
