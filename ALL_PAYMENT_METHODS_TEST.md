# Multi-Method Payment Testing Guide

Test all payment methods with automatic email delivery - **NO REAL MONEY REQUIRED**

---

## Available Payment Methods

| Method | ID | Use | Example |
|--------|----|----|---------|
| **Stripe** | `stripe` | Credit/Debit Cards | Visa, Mastercard |
| **PayPal** | `paypal` | PayPal Account | paypal.com |
| **Apple Pay** | `apple_pay` | iOS Apple Wallet | iPhone/iPad |
| **Google Pay** | `google_pay` | Android Google Wallet | Android devices |
| **Lipana** | `lipana` | M-Pesa (Kenya) | +254 phone numbers |
| **Crypto** | `crypto` | Bitcoin, ETH, etc | Blockchain |
| **Bank Transfer** | `bank_transfer` | Direct Bank | ACH, SEPA, etc |

---

## Quick Start: Test All Methods

### Prerequisites
- Backend running: `npm start` (in backend folder)
- MongoDB running or connected
- User ID from database

### Get Your User ID
```powershell
mongosh mongodb://localhost:27017/datingapp
> db.users.findOne({}, {_id: 1, name: 1, email: 1})
# Copy the _id value
```

---

## Method 1: STRIPE (Credit Card)

### Endpoint
```
POST /api/lipana/test-payment-method/stripe
```

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_50"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/stripe" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

### Expected Response
```json
{
  "ok": true,
  "transactionId": "uuid-xxxxx",
  "method": "stripe",
  "emailSent": true,
  "user": {
    "coins": 50,
    "isPremium": false,
    "email": "user@example.com"
  },
  "message": "✓ stripe payment successful - email sent to user@example.com"
}
```

### What Happens
- ✅ User coins: +50
- ✅ Email sent to user
- ✅ Transaction in DB marked COMPLETED

---

## Method 2: PAYPAL

### Endpoint
```
POST /api/lipana/test-payment-method/paypal
```

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_100"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/paypal" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

### Verify
- Check Brevo dashboard for email
- DB: `db.users.findOne({_id: ObjectId("YOUR_ID")}, {coins: 1})`

---

## Method 3: APPLE PAY

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_150"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/apple_pay" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## Method 4: GOOGLE PAY

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_250"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/google_pay" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## Method 5: LIPANA (M-Pesa)

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_500"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/lipana" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## Method 6: CRYPTOCURRENCY

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_100"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/crypto" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## Method 7: BANK TRANSFER

### Request
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_250"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/bank_transfer" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## Test PREMIUM with Each Method

Test premium upgrades with all methods:

### Stripe - Premium 1 Month
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "premium_1m"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/stripe" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body | ConvertFrom-Json | ConvertTo-Json
```

### PayPal - Premium 3 Months
```powershell
$body = @{userId=$userId; packageId="premium_3m"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/paypal" `
  -Method POST -ContentType "application/json" -Body $body | ConvertFrom-Json | ConvertTo-Json
```

### Google Pay - Premium 6 Months
```powershell
$body = @{userId=$userId; packageId="premium_6m"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/google_pay" `
  -Method POST -ContentType "application/json" -Body $body | ConvertFrom-Json | ConvertTo-Json
```

---

## All Package Options

### Coin Packages
```
coins_50    → 50 coins
coins_100   → 100 coins
coins_250   → 250 coins
coins_500   → 500 coins
```

### Premium Packages
```
premium_1m   → 1 Month
premium_3m   → 3 Months
premium_6m   → 6 Months
premium_12m  → 12 Months
```

---

## Batch Testing Script (All Methods)

Run all 7 payment methods with coins:

```powershell
$userId = "YOUR_USER_ID"
$methods = @("stripe", "paypal", "apple_pay", "google_pay", "lipana", "crypto", "bank_transfer")
$packages = @("coins_50", "coins_100", "coins_250", "coins_500")

foreach ($method in $methods) {
    Write-Host "Testing $method..." -ForegroundColor Green
    
    $body = @{
        userId = $userId
        packageId = $packages[(Get-Random -Maximum $packages.Length)]
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/$method" `
          -Method POST `
          -ContentType "application/json" `
          -Body $body
        
        $result = $response.Content | ConvertFrom-Json
        Write-Host "✓ $method SUCCESS" -ForegroundColor Green
        Write-Host "  Transaction: $($result.transactionId)" -ForegroundColor Gray
        Write-Host "  Email: $($result.user.email)" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "✗ $method FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}
```

---

## Verify Results

### 1. Check Transactions in DB
```powershell
mongosh mongodb://localhost:27017/datingapp

# See all test transactions
> db.transactions.find({userId: ObjectId("YOUR_USER_ID")}).pretty()

# Should show multiple transactions with different methods:
# { method: "stripe", status: "COMPLETED" }
# { method: "paypal", status: "COMPLETED" }
# { method: "apple_pay", status: "COMPLETED" }
# etc.
```

### 2. Check Updated User Coins
```powershell
# User should have received coins from all methods
> db.users.findOne({_id: ObjectId("YOUR_USER_ID")}, {coins: 1, isPremium: 1})
```

### 3. Check Emails in Brevo
1. Go to [Brevo Dashboard](https://app.brevo.com)
2. Transactional → Emails → Sent
3. Filter by user email
4. Should see 7+ confirmation emails (one per method)
5. Each email should contain:
   - Coins amount or premium duration
   - Price
   - Transaction ID
   - Method name

### 4. Check Server Logs
```
[LIPANA /test-payment-method/stripe] Coin email sent to: user@example.com
[LIPANA /test-payment-method/paypal] Coin email sent to: user@example.com
[LIPANA /test-payment-method/apple_pay] Coin email sent to: user@example.com
...etc
```

---

## Troubleshooting

### ❌ "User not found"
- Verify userId format: Should be 24 hex characters (ObjectId)
- Query: `db.users.findOne({}, {_id: 1})`

### ❌ Email not sent
- Check Brevo API key in `.env`
- Verify template IDs 7 & 8 are published
- Check server logs for: `[Brevo] Failed to send...`

### ❌ "Invalid method"
- Use only: `stripe, paypal, apple_pay, google_pay, lipana, crypto, bank_transfer`
- Check spelling (use underscores not hyphens for apple_pay, google_pay)

### ❌ Coins not updating
- Refresh database: `db.users.findOne({_id: ObjectId("ID")})`
- Check transaction status: `db.transactions.findOne({}, {sort: {createdAt: -1}})`

---

## Recommended Testing Flow

1. **Start with Stripe** - Most common method
2. **Test PayPal** - High volume method
3. **Test Apple Pay** - Mobile exclusive
4. **Test Google Pay** - Mobile exclusive
5. **Test Lipana** - Geo-specific
6. **Test Crypto** - Alternative payment
7. **Test Bank Transfer** - Business accounts

---

## Integration Ready

Once email service is verified working with all methods, you can:

1. Replace `test-payment-method` endpoints with real payment APIs
2. Keep the same email sending logic
3. Emails will send for real payments too

The **email infrastructure is now platform-agnostic** - works with any payment method!
