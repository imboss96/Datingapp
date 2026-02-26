# Brevo Email Automation Setup Guide

This guide explains how to set up Brevo (formerly Sendinblue) for automated email delivery in the Lunesa dating app.

## Overview

The app now uses Brevo for reliable email delivery instead of basic SMTP. This provides better deliverability, tracking, and professional email templates.

## Features

- ✅ Password reset emails
- ✅ Email verification
- ✅ Welcome emails
- ✅ Newsletter subscriptions
- ✅ Transactional email templates
- ✅ Delivery tracking and analytics

## Setup Steps

### 1. Create Brevo Account

1. Go to [brevo.com](https://brevo.com) and create a free account
2. Verify your email address
3. Complete the account setup

### 2. Get API Key

1. In your Brevo dashboard, go to **SMTP & API** → **API Keys**
2. Click **Create a new API key**
3. Give it a name like "Lunesa Production"
4. Copy the API key (you won't be able to see it again)

### 3. Create Email Templates

Create the following templates in your Brevo account:

#### Template 1: Password Reset Email
- **Name**: Password Reset
- **Subject**: Reset Your Lunesa Password
- **Design**: Use the drag-and-drop editor or HTML
- **Content**: Include `{{params.RESET_LINK}}`, `{{params.USER_NAME}}`, `{{params.EXPIRY_TIME}}`

Example HTML:
```html
<h1>Reset Your Password</h1>
<p>Hello {{params.USER_NAME}},</p>
<p>Click here to reset your password: <a href="{{params.RESET_LINK}}">Reset Password</a></p>
<p>This link expires in {{params.EXPIRY_TIME}}.</p>
```

#### Template 2: Email Verification
- **Name**: Email Verification
- **Subject**: Verify Your Lunesa Email
- **Content**: Include `{{params.VERIFICATION_LINK}}`, `{{params.USER_NAME}}`

#### Template 3: Welcome Email
- **Name**: Welcome Email
- **Subject**: Welcome to Lunesa!
- **Content**: Include `{{params.USER_NAME}}`, `{{params.LOGIN_LINK}}`

### 4. Create Contact List (Optional)

For newsletter subscriptions:
1. Go to **Contacts** → **Lists**
2. Create a list called "Lunesa Newsletter"
3. Note the List ID from the URL

### 5. Configure Environment Variables

Add these to your `.env` file:

```env
# Brevo Configuration
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_PASSWORD_RESET_TEMPLATE_ID=1
BREVO_EMAIL_VERIFICATION_TEMPLATE_ID=2
BREVO_WELCOME_EMAIL_TEMPLATE_ID=3
BREVO_NEWSLETTER_LIST_ID=4
```

### 6. Test Email Delivery

1. Start your backend server
2. Try the password reset flow
3. Check your Brevo dashboard for sent emails
4. Verify delivery in email client

## Template IDs

After creating templates, note their IDs:
- Go to **Transactional** → **Templates**
- Click on each template
- The ID is in the URL: `templates/edit/123` (123 is the ID)

## Troubleshooting

### Emails Not Sending
- Check API key is correct
- Verify template IDs match
- Check Brevo account has sending credits
- Look at server logs for error messages

### Templates Not Working
- Ensure parameter names match exactly (case-sensitive)
- Check template is active/published
- Verify HTML is valid

### API Errors
- 401: Invalid API key
- 404: Template ID not found
- 429: Rate limit exceeded

## Migration from SMTP

The app automatically uses Brevo when `BREVO_API_KEY` is configured. If not set, it falls back to SMTP (for development).

## Production Considerations

- Use a dedicated sending domain
- Set up SPF/DKIM records
- Monitor delivery rates in Brevo dashboard
- Consider paid plan for higher limits

## Support

For Brevo-specific issues:
- Brevo Help Center: https://help.brevo.com/
- API Documentation: https://developers.brevo.com/

For app-specific issues, check the server logs and ensure all environment variables are set correctly.