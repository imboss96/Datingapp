# Real Lipana Integration Setup

Your dating app is now integrated with the **real Lipana API** for M-Pesa payments!

## What Changed

✅ **Official Lipana SDK** - `@lipana/sdk` installed
✅ **Real STK Push** - Uses Lipana API instead of stub simulation
✅ **Status Polling** - Queries actual Lipana transaction status
✅ **Webhook Verification** - HMAC-SHA256 signature validation
✅ **Sandbox Ready** - Configured for testing first

---

## Configuration

Your `.env` already has the required credentials:

```env
LIPANA_SECRET_KEY=lip_sk_live_e92323ec5341c79ca2a5e6aabef2d1781f51bbd97d7124eb5ccc169af21ea699
LIPANA_ENVIRONMENT=sandbox      # Change to 'production' when ready
LIPANA_WEBHOOK_SECRET=75f8507d24945d3989200e80d4b77f7429174182728fc0b0e9f25b59f7775b22
LIPANA_WEBHOOK_URL=http://localhost:5000/api/lipana/webhook
```

---

## Testing Flow

### 1. **Frontend Request** (SELECT MOBILE MONEY)
- User selects "Mobile Money" payment method
- Enters Kenya phone: `0703147873` or `254703147873`
- Clicks "Pay"

### 2. **Backend Initiation** (`POST /api/lipana/initiate`)
```
✓ Phone validated and normalized to Kenya format (254703147873)
✓ Transaction created in DB with PENDING status
✓ **Real STK pushed to Lipana API** (not simulated!)
✓ Lipana returns: transactionId, checkoutRequestID
✓ Amount extracted from package price and sent in KES
```

**Backend Logs:**
```
[LIPANA /initiate] === START REQUEST ====
[LIPANA /initiate] Package validated: { coins: 50, price: "$4.99" }
[LIPANA /initiate] Initiating real STK push with Lipana...
[LIPANA /initiate] Real STK push response: {
  transactionId: "TXN1234567890",
  checkoutRequestID: "ws_CO_...",
  status: "pending"
}
[LIPANA /initiate] === SUCCESS === (450ms)
```

### 3. **Frontend Polling** (`GET /api/lipana/status/:txId`)
- Frontend polls every 5 seconds
- Backend queries **real Lipana API** for transaction status
- When Lipana reports `status: 'success'`, backend:
  - Updates transaction to COMPLETED
  - Updates user coins
  - Returns success to frontend

**Backend Logs:**
```
[LIPANA /status] Checking Lipana transaction status...
[LIPANA /status] Lipana transaction status: { lipanaStatus: "success" }
[LIPANA /status] ✓ Payment success detected in Lipana! Updating transaction...
[LIPANA /status] User coins updated: 100 → 150
```

### 4. **Frontend Success** 
- User sees "SUCCESS" screen
- Coins updated instantly

---

## Key Differences from Stub

| Feature | Stub | Real Lipana |
|---------|------|-----------|
| **STK Push** | Simulated (no actual M-Pesa prompt) | Real M-Pesa STK to customer phone |
| **Status Detection** | Auto-complete after 3s | Real API checks actual payment status |
| **Amount Format** | Hardcoded $1 | Extracts from price, converts to KES |
| **Webhook** | Never fires | Lipana POSTs when payment completes |
| **Phone Requirement** | Optional | Must be valid Kenya number |
| **Real Money** | None processed | Real KES charged (sandbox = test) |

---

## Test Phone Numbers

**Sandbox Environment:**
- ✅ `0703147873` - Any valid Kenya format works
- ✅ `254703147873` - International format also OK
- ℹ️ **Note**: Sandbox doesn't actually send prompts to phones. Check Lipana dashboard for transaction status.

**Production Environment:**
- 🔴 Real phone numbers required
- 💰 Real money charged
- 📱 Actual M-Pesa prompts sent

---

## Switching to Production

When ready for real payments:

### Step 1: Get Production Credentials
1. Log into Lipana Dashboard
2. Generate production API key (starts with `lip_sk_live_`)
3. Get webhook secret for production

### Step 2: Update Environment
```env
# In .env (backend only)
LIPANA_SECRET_KEY=lip_sk_live_YOUR_PRODUCTION_KEY
LIPANA_ENVIRONMENT=production          # Change from 'sandbox'
LIPANA_WEBHOOK_SECRET=YOUR_PROD_SECRET
LIPANA_WEBHOOK_URL=https://yourdomain.com/api/lipana/webhook  # HTTPS required
```

### Step 3: Update Frontend Webhook URL
Frontend needs to know webhook URL for webhook testing links:
```typescript
// In ProfileSettings.tsx or webhook service
const WEBHOOK_URL = process.env.LIPANA_WEBHOOK_URL;
```

### Step 4: Test Thoroughly
1. Use real test phone numbers
2. Verify coin updates work
3. Check webhook signatures are verified
4. Monitor error logs

### Step 5: Deploy
- Restart backend with production credentials
- Test end-to-end with real account
- Monitor first transactions

---

## Webhook Handling

Lipana sends webhook callbacks when payments complete:

```json
POST /api/lipana/webhook
X-Lipana-Signature: signature_hash

{
  "event": "transaction.success",
  "data": {
    "transactionId": "TXN1234567890",
    "amount": 5000,
    "status": "success",
    "phone": "+254712345678"
  }
}
```

**Backend validates:**
1. ✓ X-Lipana-Signature header exists
2. ✓ HMAC-SHA256 signature matches
3. ✓ Transaction found in DB by lipanaTransactionId
4. ✓ Updates transaction & user on success

**Debug logs:**
```
[LIPANA /webhook] === WEBHOOK EVENT ====
[LIPANA /webhook] ✓ Signature verified
[LIPANA /webhook] Event parsed: { eventType: "transaction.success" }
[LIPANA /webhook] ✓ Payment success detected in Lipana! Updating...
[LIPANA /webhook] User received 50 coins (100 → 150)
```

---

## Troubleshooting

### STK Not Received on Phone (Sandbox)
- ✅ **Normal!** Sandbox environment doesn't send real STK pushes
- Check Lipana dashboard for transaction status
- Switch to production when ready

### 500 Error on /initiate
**Check:**
- ✓ LIPANA_SECRET_KEY is set correctly
- ✓ Phone number is valid Kenya format
- ✓ Package price can be parsed to KES
- ✓ MongoDB connection is active

**Logs to check:**
```
[LIPANA /initiate] STK push API error: { message: "...", response: {...} }
```

### Status Remains "pending"
**Reasons:**
- Lipana hasn't updated transaction yet (wait 30s)
- Phone number isn't a valid Lipana sandbox number
- Test account doesn't have enough balance

**Solution:**
1. Check status in Lipana dashboard directly
2. Verify transaction ID matches
3. Manual test with curl:
```bash
curl -X GET https://api.lipana.dev/v1/transactions/TXN123 \
  -H "x-api-key: lip_sk_sandbox_YOUR_KEY"
```

### Webhook Signature Verification Fails
**Solution:**
1. Verify LIPANA_WEBHOOK_SECRET matches dashboard
2. Check X-Lipana-Signature header is present
3. Ensure raw request body is used (not parsed JSON)

---

## Monitoring

Add these alerts to your production monitoring:

```javascript
// Alert on high error rate
if (errors.length / requests.length > 0.05) {
  alert('LIPANA: 5%+ error rate');
}

// Alert on slow responses (should be <500ms)
if (avgResponseTime > 500) {
  alert('LIPANA: API slow');
}

// Alert on zero transactions (suspicious)
if (transactions.length === 0) {
  alert('LIPANA: No transactions in 1 hour');
}
```

---

## Support Links

- **Lipana Documentation**: https://docs.lipana.dev
- **Lipana Dashboard**: https://dashboard.lipana.dev
- **M-Pesa Test Numbers**: Check Lipana test environment docs
- **Error Codes**: https://docs.lipana.dev/errors

---

## Next Steps

1. ✅ Test the flow with real Lipana
2. ✅ Monitor logs for any errors
3. ✅ Verify coins update correctly  
4. 🔜 Switch to production credentials
5. 🔜 Deploy and test with real money
6. 🔜 Monitor for issues in production

Backend is **ready to accept real M-Pesa payments!** 🎉
