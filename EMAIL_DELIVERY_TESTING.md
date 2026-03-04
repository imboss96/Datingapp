# Email Delivery Testing & Debugging Guide

## Summary of Fixes Applied

### 1. **Template ID Correction** (backend/.env)
- **Before:** PREMIUM=8, COIN=7
- **After:** PREMIUM=7, COIN=8
- This fixes the template mismatch issue

### 2. **Enhanced Email Logging** (services/email/brevoService.js)
Added detailed logging to show:
- API key presence and first 20 characters
- Template ID being used
- Request payload being sent
- Brevo API response status
- Full error details if send fails

### 3. **Middleware Order Fix** (backend/server.js)
- **Issue:** JSON body parser applied AFTER Lipana routes
- **Fix:** Moved JSON body parser BEFORE all routes
- This allows petRequest bodies to be parsed correctly

### 4. **Transaction Model Update** (backend/models/Transaction.js)
- Added all payment methods to enum: stripe, paypal, apple_pay, google_pay, lipana, crypto, bank_transfer
- Allows transactions to be created for any payment method

### 5. **Email Response Logging** (backend/routes/lipana.js & transactions.js)
- Capture email function return value
- Log success/error status
- Throw errors if email fails

---

## Step-by-Step Testing

### Step 1: Create a Test User

Run this from the project root:

```powershell
cd backend
node create-test-user.mjs
```

This will create a user and output something like:
```
✓ Test user created:
  ID: 69a770442f63d156b1746ec7
  UUID: 0ab07445-eca9-43a7-9893-c879aae5cff3
  Email: test@example.comName: Test User

Now you can use this user ID in your payment tests:
  userId: "69a770442f63d156b1746ec7"
```

**Save the user ID** - you'll need it for the test.

### Step 2: Start Backend (if not running)

```powershell
cd backend
npm start
```

Wait 3-5 seconds for startup.

### Step 3: Test Coin Purchase Payment

In a new PowerShell terminal:

```powershell
$userId = "YOUR_USER_ID_HERE"  # Replace with ID from Step 1
$body = @{
  userId = $userId
  packageId = "coins_50"
  method = "stripe"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:5000/api/lipana/test-payment-method/stripe" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -UseBasicParsing
```

### Step 4: Check Console Logs

Watch the backend terminal for these logs:

**Transaction Progress:**
```
[LIPANA /test-payment-method/stripe] ▶ PAYMENT REQUEST RECEIVED
[LIPANA /test-payment-method/stripe] ✓ Package found in CoinPackage collection
[LIPANA /test-payment-method/stripe] ✓ TRANSACTION CREATED
[LIPANA /test-payment-method/stripe] ✓ USER FOUND
[LIPANA /test-payment-method/stripe] ✓ USER COINS UPDATED
[LIPANA /test-payment-method/stripe] ✓ USER SAVED TO DATABASE
[LIPANA /test-payment-method/stripe] ✓ TRANSACTION STATUS: COMPLETED
```

**Email Service Logs (NEW - This is what to look for):**
```
[Brevo] sendCoinPurchaseEmail START
  Email: test@example.com
  User: Test User
  Coins: 50
  Template ID: 8
  API Key present: true
  API Key first 20 chars: xkeysib-e4066d9714...
  Sending to Brevo API...
  Response status: 200
  Response ok: true
[✓Brevo] Coin purchase email sent successfully
  Message ID: <0000164a-1234-5678-9abc-def0123456789@phx.gstaging.google.com>
```

**Then in the transaction log:**
```
[LIPANA /test-payment-method/stripe] Email result: {
  success: true,
  messageId: '<0000164a-1234-5678-9abc-def0123456789@phx.gstaging.google.com>'
}
[LIPANA /test-payment-method/stripe] ✓ COIN PURCHASE EMAIL SENT
```

---

## Troubleshooting

### Issue: "User not found"
**Solution:**
- Make sure you're using the correct MongoDB ObjectId (e.g., "69a770442f63d156b1746ec7")
- Not the UUID field
- Verify the user was created successfully in the previous step

### Issue: "Invalid method"
**Solution:**
- Use one of: stripe, paypal, apple_pay, google_pay, lipana, crypto, bank_transfer
- Transaction model was updated to support all methods

### Issue: Email logs show "[✗Brevo] Failed to send email"
**Check:**
1. API Key: Verify BREVO_API_KEY in backend/.env is correct
2. Template ID: Verify BREVO_COIN_PURCHASE_TEMPLATE_ID=8 exists in your Brevo account
3. Template Variables: Check template has {{params.USER_NAME}}, {{params.COINS}}, {{params.PRICE}}
4. Recipient: Verify test@example.com is a valid destination or update in code

### Issue: No logs appearing in console
**Solution:**
1. Restart backend: Kill node process with `taskkill /F /IM node.exe`
2. Start fresh: `cd backend && npm start`
3. Wait full 5 seconds before testing
4. Check you're looking at the right terminal window

---

## Testing All Payment Methods

You can test all 7 payment methods to verify emails send for each:

```powershell
$methods = @('stripe', 'paypal', 'apple_pay', 'google_pay', 'lipana', 'crypto', 'bank_transfer')
$userId = "YOUR_USER_ID_HERE"

foreach ($method in $methods) {
  $body = @{
    userId = $userId
    packageId = "coins_100"  # Use different package each time
    method = $method
  } | ConvertTo-Json
  
  Write-Host "`n=== Testing $method ===" -ForegroundColor Cyan
  
  try {
    $response = Invoke-WebRequest `
      -Uri "http://localhost:5000/api/lipana/test-payment-method/$method" `
      -Method Post `
      -Headers @{"Content-Type"="application/json"} `
      -Body $body `
      -UseBasicParsing `
      -ErrorAction SilentlyContinue
    
    Write-Host "✓ Status $($response.StatusCode)" -ForegroundColor Green
    ($response.Content | ConvertFrom-Json).ok ? "✓ Payment successful" : "✗ Payment failed"
  } catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
  }
  
  Start-Sleep -Seconds 1
}
```

After running tests, **check Brevo Dashboard** at https://app.brevo.com/dashboard/communication/webhooks:
- Go to "Transactional" section
- Search for emails to test@example.com
- Verify coin purchase emails were sent

---

## Environment Variables Critical for Email

In `backend/.env`, verify these are set:

```env
BREVO_API_KEY=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
BREVO_PREMIUM_UPGRADE_TEMPLATE_ID=7
BREVO_COIN_PURCHASE_TEMPLATE_ID=8
BREVO_API_URL=https://api.brevo.com/v3
```

**Important:** If you see empty or different values, update them immediately and restart the backend.

---

## Next Steps When Email Delivers Successfully

Once emails are sending:

1. **Update user's real email** in database (change from test@example.com to your email)
2. **Test with all payment methods** to ensure uniform behavior
3. **Check Brevo analytics** to see open rates and engagement
4. **Monitor logs** to catch any future issues early
5. **Deploy** with confidence knowing email flow works end-to-end

---

## Quick Check Endpoints

Get list of available payment methods:
```
GET http://localhost:5000/api/transactions/test-methods
```

Health check:
```
GET http://localhost:5000/api/health
```
