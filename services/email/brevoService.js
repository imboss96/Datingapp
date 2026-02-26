/**
 * Brevo Email Service
 * Handles all email communications via Brevo API
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

// Helper to get env vars at call time (not module load time)
const getConfig = () => ({
  apiKey: process.env.BREVO_API_KEY,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  passwordResetTemplateId: parseInt(process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID) || 1,
  emailVerificationTemplateId: parseInt(process.env.BREVO_EMAIL_VERIFICATION_TEMPLATE_ID) || 2,
  welcomeEmailTemplateId: parseInt(process.env.BREVO_WELCOME_EMAIL_TEMPLATE_ID) || 3,
  newsletterListId: parseInt(process.env.BREVO_NEWSLETTER_LIST_ID) || 4,
});

/**
 * Send transactional email via Brevo
 */
export const sendTransactionalEmail = async (emailData) => {
  try {
    const { apiKey } = getConfig();
    const { email, subject, htmlContent, textContent, senderEmail, senderName } = emailData;

    const payload = {
      sender: {
        name: senderName || 'Admin',
        email: senderEmail || 'admin@lunesalove.com'
      },
      to: [{ email }],
      subject,
      htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>/g, '')
    };

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Brevo API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Brevo] Email sent successfully:', result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe user to newsletter
 */
export const subscribeToNewsletter = async (email, firstName = '', lastName = '') => {
  try {
    const { apiKey, newsletterListId } = getConfig();

    const payload = {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName
      },
      listIds: [newsletterListId],
      updateEnabled: true
    };

    const response = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'duplicate_parameter') {
        console.log('[Brevo] Contact already exists in newsletter list');
        return { success: true, message: 'Already subscribed' };
      }
      throw new Error(`Brevo API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Brevo] Newsletter subscription successful:', result.id);

    return { success: true, contactId: result.id };
  } catch (error) {
    console.error('[Brevo] Failed to subscribe to newsletter:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email using Brevo template
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const { apiKey, passwordResetTemplateId, frontendUrl } = getConfig();

    console.log('[Brevo DEBUG] Starting password reset email send for:', email);
    console.log('[Brevo DEBUG] BREVO_API_KEY exists:', !!apiKey);
    console.log('[Brevo DEBUG] BREVO_API_KEY starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');

    const userName = email.split('@')[0];
    // ✅ FIX: Added /# so HashRouter can handle the route correctly
    const resetUrl = `${frontendUrl}/#/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const payload = {
      to: [{ email }],
      templateId: passwordResetTemplateId,
      params: {
        USER_NAME: userName,
        USER_EMAIL: email,
        RESET_LINK: resetUrl,
        EXPIRY_TIME: '15 minutes'
      }
    };

    console.log('[Brevo DEBUG] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('[Brevo DEBUG] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[Brevo DEBUG] Error response body:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { message: errorText };
      }
      throw new Error(`Brevo API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Brevo] Password reset email sent successfully:', result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email for new users using Brevo template
 */
export const sendWelcomeEmail = async (email, name) => {
  try {
    const { apiKey, welcomeEmailTemplateId, frontendUrl } = getConfig();
    // ✅ FIX: Added /# so HashRouter can handle the route correctly
    const loginUrl = `${frontendUrl}/#/login`;

    const payload = {
      to: [{ email }],
      templateId: welcomeEmailTemplateId,
      params: {
        USER_NAME: name,
        USER_EMAIL: email,
        LOGIN_LINK: loginUrl
      }
    };

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Brevo API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Brevo] Welcome email sent successfully:', result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email verification
 */
export const sendEmailVerificationEmail = async (email, verificationToken) => {
  try {
    const { apiKey, emailVerificationTemplateId, frontendUrl } = getConfig();

    const userName = email.split('@')[0];
    // ✅ FIX: Added /# so HashRouter can handle the /verify-email route correctly
    const verificationUrl = `${frontendUrl}/#/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    const payload = {
      to: [{ email }],
      templateId: emailVerificationTemplateId,
      params: {
        USER_NAME: userName,
        USER_EMAIL: email,
        VERIFICATION_LINK: verificationUrl,
        EXPIRY_TIME: '15 minutes'
      }
    };

    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Brevo API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Brevo] Email verification sent successfully:', result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Failed to send email verification:', error);
    return { success: false, error: error.message };
  }
};