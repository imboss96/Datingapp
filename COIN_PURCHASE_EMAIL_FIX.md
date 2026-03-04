# Coin Purchase Email Fix - Complete

## What Was Fixed

### 1. **Email Sending in Webhook** ✓
The Lipana webhook handler now sends confirmation emails when a payment is successful (lines 559-592 in `backend/routes/lipana.js`):
- **For Coin Purchases**: Uses `sendCoinPurchaseEmail()` with coin amount and price
- **For Premium Upgrades**: Uses `sendPremiumUpgradeEmail()` with plan duration
- Non-blocking: Email failures won't fail the transaction

### 2. **New Test Payment Endpoint** ✓
Created `/api/lipana/test-payment` (POST) that:
- **Bypasses Lipana's real payment system** (no actual transaction needed)
- **Creates a completed transaction** immediately
- **Sends the confirmation email** the same way as real payments
- **Updates user coins/premium** status

## How to Test

### Option A: Test Without Real Payment (Recommended for Demo)

```bash
curl -X POST http://localhost:5000/api/lipana/test-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "packageId": "coins_50"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "transactionId": "uuid-here",
  "message": "Test payment processed successfully and confirmation email sent"
}
```

**What Happens:**
1. ✓ Transaction created with status "COMPLETED"
2. ✓ User coins updated
3. ✓ Confirmation email sent to user's email
4. ✓ Logs show: `[LIPANA /test-payment] Coin purchase email sent to: user@example.com`

### Option B: Real Lipana Payment Flow

When user makes real payment via Lipana M-Pesa:
1. User initiates payment with `/api/lipana/initiate`
2. User completes payment on their phone
3. Lipana sends webhook to `/api/lipana/webhook`
4. **NEW**: Webhook now sends confirmation email automatically

## Available Packages for Testing

```javascript
coins_50   - 50 coins for $4.99
coins_100  - 100 coins for $9.99
coins_250  - 250 coins for $19.99
coins_500  - 500 coins for $29.99
premium_1m  - 1 Month premium for $4.99
premium_3m  - 3 Months premium for $12.99
premium_6m  - 6 Months premium for $19.99
premium_12m - 12 Months premium for $29.99
```

## Email Configuration

Your `.env` is already configured:
```env
BREVO_API_KEY=xkeysib-...
BREVO_COIN_PURCHASE_TEMPLATE_ID=8
BREVO_PREMIUM_UPGRADE_TEMPLATE_ID=7
```

Email will be sent to the user's registered email address with:
- Coins purchased amount
- Price paid
- Transaction ID
- Purchase date
- Link to shop

## Debugging

If emails aren't being sent:

1. **Check server logs** for:
   ```
   [LIPANA /webhook] Coin purchase email sent to: user@email.com
   [LIPANA /test-payment] Coin purchase email sent to: user@email.com
   ```

2. **Check Brevo account** for:
   - Sent emails in Brevo dashboard
   - Template ID 8 exists and is published
   - API key is valid

3. **Verify user email** in database:
   ```javascript
   db.users.findOne({ _id: userId }, { email: 1 })
   ```

## Files Modified

- `backend/routes/lipana.js` - Added email sending to webhook + test endpoint
