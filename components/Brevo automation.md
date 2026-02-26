# 📧 Brevo Email Automation Integration Guide

Quick reference for implementing Brevo email automation in your Shopki application.

---

## Quick Setup (5 Minutes)

### 1. Get Brevo Credentials

```
Go to: https://www.brevo.com
1. Sign up (free account)
2. Go to Account → SMTP & API
3. Copy your API Key
4. Create sender address (Account → Senders)
5. Note down your newsletter list ID (optional)
```

### 2. Add to `.env`

```env
# Brevo Email Configuration
REACT_APP_BREVO_API_KEY=your_api_key_here
REACT_APP_BREVO_SENDER_EMAIL=orders@yourdomain.com
REACT_APP_BREVO_NEWSLETTER_LIST_ID=3

# Base URL
REACT_APP_BASE_URL=http://localhost:3000
```

### 3. Done! ✅

Emails will now automatically send for:
- ✅ Account creation (welcome email)
- ✅ Order confirmation
- ✅ Order status updates
- ✅ Newsletter signup
- ✅ Password resets (when implemented)

---

## Automated Workflows

### 1. Account Creation Email

**When:** User signs up  
**File:** `src/context/AuthContext.jsx`  
**Function:** `sendAccountConfirmationEmail()`

```javascript
// Automatically called in signup() function
await sendAccountConfirmationEmail(email, displayName);
```

**Email Includes:**
- Welcome message
- Account confirmation
- Link to verify email (optional)

---

### 2. Order Confirmation Email

**When:** Customer places an order  
**File:** `src/pages/CheckoutPage.jsx`  
**Function:** `sendOrderConfirmation()`

```javascript
const orderData = {
  id: orderId,
  items: cartItems,
  total: total,
  createdAt: new Date().toISOString()
};

await sendOrderConfirmation(user.email, orderData);
```

**Email Includes:**
- Order ID
- Items list with quantities
- Order total
- Estimated delivery date
- Link to track order

---

### 3. Order Status Update Email

**When:** Admin updates order status  
**File:** `src/services/firebase/firestoreHelpers.js`  
**Function:** `sendOrderStatusUpdate()`

**Statuses & Messages:**
```
pending       → "Order received and being prepared"
processing    → "Order is being processed and will ship soon"
shipped       → "Order shipped! Track with tracking number"
completed     → "Order delivered! Rate your purchase"
cancelled     → "Order has been cancelled"
returned      → "Return processed"
```

```javascript
// Automatically called when admin updates status
const orderInfo = {
  id: orderId,
  status: newStatus,      // pending, processing, shipped, completed, cancelled, returned
  trackingNumber: null    // optional
};
await sendOrderStatusUpdate(customerEmail, orderInfo);
```

**Email Includes:**
- New order status
- Status-specific message
- Tracking number (if shipping)
- Link to order details

---

### 4. Newsletter Signup Email

**When:** User subscribes to newsletter  
**File:** `src/components/user/Profile/PreferencesSettings.jsx`  
**Function:** `registerForNewsletter()`

```javascript
// Called when user enables newsletter preference
await registerForNewsletter(email, displayName);
```

**Email Includes:**
- Welcome to newsletter
- Benefits of subscription
- Link to manage preferences
- Unsubscribe link

---

### 5. Promotional Email (Manual)

**Usage:** Send campaigns to newsletter subscribers  
**File:** Any admin component  
**Function:** `sendPromotionalEmail()`

```javascript
const promoData = {
  title: 'Summer Sale - 50% Off!',
  message: 'Limited time offers on selected items',
  subject: 'Exclusive Summer Deals!',
  products: [
    { name: 'Product 1', price: 5000, discount: 50 },
    { name: 'Product 2', price: 3000, discount: 30 }
  ],
  expiryDate: '2025-12-31',
  campaignId: 'summer_2025'
};

await sendPromotionalEmail(email, promoData);
```

---

### 6. Abandoned Cart Email (Manual)

**Usage:** Send reminder about abandoned carts  
**File:** Any component  
**Function:** `sendAbandonedCartEmail()`

```javascript
const cartItems = [
  { name: 'Product Name', price: 5000, quantity: 2 },
  { name: 'Another Product', price: 3000, quantity: 1 }
];

const cartTotal = 13000;

await sendAbandonedCartEmail(email, cartItems, cartTotal);
```

---

## File Structure

```
src/services/email/
├── brevoService.js              # Low-level Brevo API
│   ├── sendTransactionalEmail()
│   ├── sendPasswordResetEmail()
│   ├── subscribeToNewsletter()
│   └── ... other functions
│
└── emailAutomation.js           # High-level automation
    ├── sendAccountConfirmationEmail()
    ├── sendOrderConfirmation()
    ├── sendOrderStatusUpdate()
    ├── sendNewsletterConfirmation()
    ├── sendPromotionalEmail()
    ├── sendAbandonedCartEmail()
    └── registerForNewsletter()

src/context/
└── AuthContext.jsx              # Triggers welcome email on signup

src/pages/
├── CheckoutPage.jsx             # Triggers order confirmation
└── admin/AdminDashboard.jsx      # Triggers order status emails

src/services/firebase/
└── firestoreHelpers.js          # updateOrderStatus() triggers email
```

---

## Integration Checklist

- [ ] Create Brevo account at https://www.brevo.com
- [ ] Get API key from Account → SMTP & API
- [ ] Create sender address and note the email
- [ ] Add to `.env` file:
  - `REACT_APP_BREVO_API_KEY`
  - `REACT_APP_BREVO_SENDER_EMAIL`
  - `REACT_APP_BREVO_NEWSLETTER_LIST_ID` (optional)
  - `REACT_APP_BASE_URL`
- [ ] Test account creation (sign up for account)
- [ ] Test order confirmation (place test order)
- [ ] Test order status update (admin updates order status)
- [ ] Check Brevo dashboard for email logs

---

## Testing

### Test 1: Welcome Email

```
1. Go to http://localhost:3000/signup
2. Create account with test email
3. Check inbox for welcome email
4. Check Brevo Dashboard → Transactional → Logs
```

### Test 2: Order Confirmation

```
1. Add product to cart
2. Go to checkout
3. Place order
4. Check inbox for order confirmation
5. Verify order details in email
```

### Test 3: Order Status Update

```
1. Go to http://localhost:3000/admin
2. Go to Orders tab
3. Click on an order
4. Change status to "processing" or "shipped"
5. Check inbox for status update email
```

### Test 4: Newsletter Signup

```
1. Go to http://localhost:3000/profile
2. Go to Preferences tab
3. Enable "Newsletter" checkbox
4. Click "Save All Preferences"
5. Check inbox for newsletter confirmation
```

---

## Troubleshooting

### Emails Not Sending?

**Check 1: API Key**
```javascript
// In browser console
console.log(process.env.REACT_APP_BREVO_API_KEY);
// Should show your key, not undefined
```

**Check 2: Sender Email Verified**
- Login to Brevo
- Go to Senders → Sender List
- Verify your sender email is verified (green checkmark)

**Check 3: Browser Console**
- Press F12 to open DevTools
- Check Console tab for error messages
- Look for "Brevo email error" or network errors

**Check 4: Brevo Dashboard**
- Login to https://app.brevo.com
- Go to Transactional → Logs
- Search for your email
- Check if Status is "Success" or "Failed"
- If Failed, click to see error details

**Check 5: Environment Variables**
```javascript
// In any component
console.log('API Key:', process.env.REACT_APP_BREVO_API_KEY);
console.log('Sender Email:', process.env.REACT_APP_BREVO_SENDER_EMAIL);
console.log('Base URL:', process.env.REACT_APP_BASE_URL);
```

### Email Going to Spam?

1. **Verify sender domain in Brevo**
   - Brevo Dashboard → Senders → Click sender
   - Add SPF/DKIM records to your domain

2. **Use professional email**
   - Don't use `noreply@` or generic emails
   - Use `orders@yourdomain.com` or similar

3. **Add unsubscribe links**
   - Already included in email templates

4. **Warm up reputation**
   - Start with small volume
   - Monitor bounce rates in Brevo dashboard

### High Bounce Rate?

1. Check email list quality
2. Remove hard bounces in Brevo dashboard
3. Implement double opt-in for newsletter
4. Monitor complaints

---

## Adding Custom Emails

### 1. Create New Email Function

**File:** `src/services/email/emailAutomation.js`

```javascript
export const sendCustomEmail = async (email, customData) => {
  try {
    const htmlContent = `
      <h2>Custom Email Title</h2>
      <p>Hi ${customData.name},</p>
      <p>${customData.message}</p>
      <a href="${process.env.REACT_APP_BASE_URL}/your-link">
        Click Here
      </a>
    `;

    const result = await sendTransactionalEmail({
      email,
      subject: customData.subject || 'Subject Line',
      htmlContent
    });

    return result;
  } catch (error) {
    console.error('Error sending custom email:', error);
    return { success: false, error: error.message };
  }
};
```

### 2. Import and Use

```javascript
import { sendCustomEmail } from '../services/email/emailAutomation';

// In your component/function
const customData = {
  name: 'John',
  message: 'Your custom message',
  subject: 'Custom Subject'
};

await sendCustomEmail(email, customData);
```

---

## Email Templates

All email templates use professional HTML/CSS and include:
- Responsive design (mobile-friendly)
- Brand colors and styling
- Unsubscribe links
- Contact information
- Social links (customizable)

**To customize templates:**
1. Edit HTML content in respective functions
2. Add your logo URL
3. Change colors to match branding
4. Add custom messaging

---

## Production Checklist

- [ ] Use paid Brevo plan (if sending > 300/day)
- [ ] Verify sender domain (SPF/DKIM records)
- [ ] Test all email types before launch
- [ ] Monitor email delivery metrics
- [ ] Set up unsubscribe handling
- [ ] Monitor bounce/complaint rates
- [ ] Create backup email service
- [ ] Document email template changes

---

## Support & Resources

- **Brevo Docs:** https://developers.brevo.com
- **API Reference:** https://developers.brevo.com/docs/getting-started
- **Email Templates:** Customize in `emailAutomation.js`
- **GitHub Issues:** Report bugs/requests

---

**Last Updated:** December 24, 2025  
**Status:** ✅ Production Ready