# Quick Reference: Payment Method Test Endpoints

## 🎯 Main Endpoints

### Single Method Test
```
POST /api/lipana/test-payment-method/{method}

Body:
{
  "userId": "USER_ID",
  "packageId": "coins_50"
}
```

### Quick Test (No Method Specified)
```
POST /api/lipana/test-payment

Body:
{
  "userId": "USER_ID",
  "packageId": "coins_50"
}
```

---

## 💳 All Available Payment Methods

```
stripe          - Credit/Debit Card
paypal          - PayPal
apple_pay       - Apple Pay (iOS)
google_pay      - Google Pay (Android)
lipana          - Mobile Money (M-Pesa)
crypto          - Cryptocurrency
bank_transfer   - Bank Transfer
```

---

## 📦 Available Packages

### Coins
- `coins_50` → 50 coins ($4.99)
- `coins_100` → 100 coins ($9.99)
- `coins_250` → 250 coins ($19.99)
- `coins_500` → 500 coins ($29.99)

### Premium
- `premium_1m` → 1 Month ($4.99)
- `premium_3m` → 3 Months ($12.99)
- `premium_6m` → 6 Months ($19.99)
- `premium_12m` → 12 Months ($29.99)

---

## 🚀 Quick Test Commands

### Get User ID
```powershell
mongosh mongodb://localhost:27017/datingapp
> db.users.findOne({}, {_id: 1})
```

### Test One Method
```powershell
$userId = "PASTE_ID_HERE"
$body = @{userId=$userId; packageId="coins_50"} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/stripe" `
  -Method POST -ContentType "application/json" -Body $body | ConvertFrom-Json | ConvertTo-Json
```

### Test All Methods (Auto Script)
```powershell
# Run the PowerShell script
.\test-all-methods.ps1 -UserId "USER_ID_HERE"

# Or with custom package
.\test-all-methods.ps1 -UserId "USER_ID_HERE" -PackageId "premium_1m"
```

---

## ✉️ What Happens Per Transaction

✅ Transaction created in MongoDB  
✅ User coins/premium updated  
✅ **Confirmation email sent** (via Brevo)  
✅ Transaction ID returned  

---

## 🔍 Verify Results

### Check Coins Updated
```powershell
mongosh mongodb://localhost:27017/datingapp
> db.users.findOne({_id: ObjectId("USER_ID")}, {coins: 1, email: 1})
```

### Check Transactions
```powershell
> db.transactions.find({userId: ObjectId("USER_ID")}).pretty()
```

### Check Emails Sent
1. Go to https://app.brevo.com
2. Transactional → Emails → Sent
3. Filter by user email
4. Should see confirmation emails

---

## 🔧 Example: Test All 7 Methods Quickly

```powershell
# Set your user ID
$userId = "ACTUAL_USER_ID"

# Array of methods
$methods = "stripe", "paypal", "apple_pay", "google_pay", "lipana", "crypto", "bank_transfer"

# Test each
foreach ($method in $methods) {
    Write-Host "Testing $method..." -ForegroundColor Cyan
    
    $body = @{userId=$userId; packageId="coins_50"} | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/$method" `
      -Method POST -ContentType "application/json" -Body $body
    
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.ok) {
        Write-Host "✓ $method SUCCESS - Email: $($result.user.email)`n" -ForegroundColor Green
    } else {
        Write-Host "✗ $method FAILED - Error: $($result.message)`n" -ForegroundColor Red
    }
}
```

---

## 📊 Response Format

All successful responses return:
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

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "User not found" | Verify user ID exists in MongoDB |
| "Invalid method" | Use correct method ID (see list above) |
| "Invalid package id" | Use valid packageId (see packages list) |
| Email not sent | Check Brevo API key in `.env` and template IDs 7 & 8 |
| Coins not updating | Refresh MongoDB query, check transaction status |
| Backend error | Check server logs for detailed error message |

---

## 📝 Next Steps After Testing

1. **Email Service Verified** ✅
2. Replace test endpoints with real payment APIs:
   - Stripe API for credit cards
   - PayPal SDK
   - Apple Pay API
   - Google Pay API
   - Lipana API (already integrated)
3. Keep email sending code (WORKS FOR ALL METHODS)
4. Deploy to production

---

## 📚 Full Documentation

- [ALL_PAYMENT_METHODS_TEST.md](ALL_PAYMENT_METHODS_TEST.md) - Comprehensive guide
- [END_TO_END_TEST_GUIDE.md](END_TO_END_TEST_GUIDE.md) - End-to-end testing
- [TEST_COIN_PURCHASE.md](TEST_COIN_PURCHASE.md) - Basic coin purchase test
