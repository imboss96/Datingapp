# Brevo Template Setup Guide

## ⚠️ IMPORTANT: Template IDs are Auto-Assigned

**Brevo automatically assigns template IDs when you create templates. You cannot manually set them.**

### Correct Process:

1. **Create templates first** (they get auto-assigned IDs like 123, 124, 125)
2. **Note down the assigned IDs** from the URL
3. **Update your .env file** with the actual IDs

## Step-by-Step: Creating Email Templates

### 1. Access Brevo Templates
1. Log into your [Brevo account](https://brevo.com)
2. Go to **Transactional** → **Templates** (in the left sidebar)
3. Click **Create a template**

### 2. Create Template 1: Password Reset
```
Template Name: Password Reset
Subject: Reset Your Lunesa Password
```

**Design Options:**
- Choose **"Code your own"** or **"Drag & drop"**
- For drag & drop: Use the visual editor
- For code: Copy the HTML from `password-reset-template.html`

**After Creation:** Check URL for ID → `templates/edit/123` (123 = your actual ID)

### 3. Create Template 2: Email Verification
```
Template Name: Email Verification
Subject: Verify Your Lunesa Email
```

**After Creation:** Check URL for ID → `templates/edit/124` (124 = your actual ID)

### 4. Create Template 3: Welcome Email
```
Template Name: Welcome Email
Subject: Welcome to Lunesa!
```

**After Creation:** Check URL for ID → `templates/edit/125` (125 = your actual ID)

## How to Get Template IDs

### After Creating Templates:
1. Go to **Transactional** → **Templates**
2. Click on each template you created
3. Look at the browser URL: `https://app.brevo.com/templates/edit/123`
4. The number at the end (123) is your template ID
5. **Write down these IDs** - you'll need them for your .env file

## Update Your .env File

After creating all templates and noting their IDs, update your `backend/.env` file:

```env
# Replace the placeholder IDs with your actual Brevo template IDs
BREVO_PASSWORD_RESET_TEMPLATE_ID=123    # ← Your actual password reset template ID
BREVO_EMAIL_VERIFICATION_TEMPLATE_ID=124 # ← Your actual email verification template ID  
BREVO_WELCOME_EMAIL_TEMPLATE_ID=125     # ← Your actual welcome email template ID
```

## Template Parameters Required

### Template 1 (Password Reset):
```
{{params.RESET_LINK}} - The secure reset URL
{{params.USER_NAME}} - User's name
{{params.EXPIRY_TIME}} - "15 minutes"
{{params.USER_EMAIL}} - User's email
```

### Template 2 (Email Verification):
```
{{params.VERIFICATION_LINK}} - Email verification URL
{{params.USER_NAME}} - User's name
{{params.EXPIRY_TIME}} - "24 hours"
{{params.USER_EMAIL}} - User's email
```

### Template 3 (Welcome Email):
```
{{params.USER_NAME}} - User's name
{{params.USER_EMAIL}} - User's email
{{params.LOGIN_LINK}} - Link to login page
```

## Testing Templates

1. Go to **Transactional** → **Templates**
2. Click **Test** on your template
3. Enter test values for all parameters
4. Send test email to yourself

## Publishing Templates

1. Click **Save** to save as draft
2. Click **Publish** to make template active
3. Only published templates can be used by the API

## Troubleshooting

- **Template not found**: Check if template ID in .env matches Brevo exactly
- **Parameters not working**: Ensure parameter names are exact (case-sensitive)
- **Emails not sending**: Verify template is published and API key is valid

## Current Status:
```
✅ Brevo API configured
✅ Backend ready
⏳ Create 3 templates in Brevo
⏳ Get auto-assigned IDs
⏳ Update .env with real IDs
⏳ Test email delivery
```

Make sure to update your .env file with the actual template IDs from Brevo!</content>
<parameter name="filePath">c:\Users\SEAL TEAM\Documents\DATING\Datingapp-1\BREVO_TEMPLATE_SETUP.md