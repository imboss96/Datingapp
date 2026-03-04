# Transaction Status Logging Guide

## 📊 Comprehensive Logging Added

The backend now logs **every step** of a transaction with detailed status information.

---

## 🔍 What Gets Logged

### For Each Transaction:
✅ Payment request received with parameters  
✅ Parameter validation status  
✅ Package lookup and details  
✅ Transaction creation with ID  
✅ User lookup and current profile  
✅ User profile update (coins/premium)  
✅ Database save confirmations  
✅ Email sending status  
✅ Final completion with timing  
✅ All errors with stack traces  

---

## 📋 Sample Log Output

```
================================================================================
[LIPANA] 2026-03-04T15:30:45.123Z
[LIPANA /test-payment-method/stripe] ► PAYMENT REQUEST RECEIVED
  User ID: 507f1f77bcf86cd799439011
  Package ID: coins_50
  Method: stripe

[LIPANA /test-payment-method/stripe] ▶ Looking up package...
[LIPANA /test-payment-method/stripe] ✓ Package found in PACKAGES fallback
    - Coins: 50
    - Price: $4.99
    - Type: COINS

[LIPANA /test-payment-method/stripe] ▶ Creating transaction...
[LIPANA /test-payment-method/stripe] ✓ TRANSACTION CREATED
    - Transaction ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
    - Status: PENDING
    - Type: COIN_PURCHASE
    - Amount: 50

[LIPANA /test-payment-method/stripe] ▶ Looking up user...
[LIPANA /test-payment-method/stripe] ✓ USER FOUND
    - Email: john@example.com
    - Name: John Doe
    - Current Coins: 10
    - Is Premium: false

[LIPANA /test-payment-method/stripe] ▶ Updating user profile...
[LIPANA /test-payment-method/stripe] ✓ USER COINS UPDATED
    - Before: 10
    - After: 60
    - Added: 50

[LIPANA /test-payment-method/stripe] ✓ USER SAVED TO DATABASE

[LIPANA /test-payment-method/stripe] ▶ Marking transaction as COMPLETED...
[LIPANA /test-payment-method/stripe] ✓ TRANSACTION STATUS: COMPLETED

[LIPANA /test-payment-method/stripe] ▶ Sending confirmation email...
[LIPANA /test-payment-method/stripe] ✓ COIN PURCHASE EMAIL SENT
    - To: john@example.com
    - Coins: 50
    - Price: $4.99

[LIPANA /test-payment-method/stripe] ✓ PAYMENT COMPLETE
    - Total Time: 324ms
================================================================================
```

---

## 🎯 Log Symbols

| Symbol | Meaning |
|--------|---------|
| `►` | Starting a process |
| `▶` | Processing/attempting something |
| `✓` | Success/completed |
| `✗` | Validation failed |
| `⚠` | Warning/non-blocking issue |

---

## 📍 Key Log Points

### 1. **Request Entry**
```
[LIPANA /test-payment-method/stripe] ► PAYMENT REQUEST RECEIVED
```
Logs when payment request arrives with all input parameters.

### 2. **Package Lookup**
```
[LIPANA /test-payment-method/stripe] ▶ Looking up package...
[LIPANA /test-payment-method/stripe] ✓ Package found
    - Coins: 50
    - Price: $4.99
```
Shows if package found and its details.

### 3. **Transaction Creation**
```
[LIPANA /test-payment-method/stripe] ▶ Creating transaction...
[LIPANA /test-payment-method/stripe] ✓ TRANSACTION CREATED
    - Transaction ID: a1b2c3d4-...
    - Status: PENDING
```
Transaction ID for tracking.

### 4. **User Lookup**
```
[LIPANA /test-payment-method/stripe] ▶ Looking up user...
[LIPANA /test-payment-method/stripe] ✓ USER FOUND
    - Email: john@example.com
    - Current Coins: 10
```
User profile before update.

### 5. **User Update**
```
[LIPANA /test-payment-method/stripe] ▶ Updating user profile...
[LIPANA /test-payment-method/stripe] ✓ USER COINS UPDATED
    - Before: 10
    - After: 60
    - Added: 50
```
Shows coin changes.

### 6. **Email Status**
```
[LIPANA /test-payment-method/stripe] ▶ Sending confirmation email...
[LIPANA /test-payment-method/stripe] ✓ COIN PURCHASE EMAIL SENT
    - To: john@example.com
    - Coins: 50
```
Email delivery status.

### 7. **Completion**
```
[LIPANA /test-payment-method/stripe] ✓ PAYMENT COMPLETE
    - Total Time: 324ms
```
Final status and processing time.

---

## ❌ Error Logging

### When validation fails:
```
[LIPANA /test-payment-method/stripe] ✗ VALIDATION FAILED: Missing userId
```

### When user not found:
```
[LIPANA /test-payment-method/stripe] ✗ USER NOT FOUND: 507f1f77bcf86cd799439011
```

### When email fails:
```
[LIPANA /test-payment-method/stripe] ⚠ EMAIL SENDING FAILED
    - Error: Brevo API key invalid
```

### When error occurs:
```
[LIPANA /test-payment-method/stripe] ✗ ERROR OCCURRED
    - Error: Connection timeout
    - Stack: Error: connect ECONNREFUSED...
    - Duration: 5000ms
```

---

## 🚀 How to Use Logs

### 1. **Monitor in Real-Time**
Keep terminal open while running tests:
```powershell
cd backend
npm start
```
Logs print to console immediately.

### 2. **Check Specific Transaction**
Look for Transaction ID in logs to track entire flow:
```
Transaction ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 3. **Trace Problems**
For failures, look for:
- `✗` markers showing where it failed
- Error messages with full stack trace
- Operation timing to find slow steps

### 4. **Save Logs to File**
```powershell
cd backend
npm start | Out-File -FilePath logs.txt -Append
```

### 5. **Filter By Payment Method**
Search logs for specific method:
```powershell
# In PowerShell
Get-Content logs.txt | Select-String "stripe"
Get-Content logs.txt | Select-String "paypal"
```

---

## 📊 Log Sections

Each transaction creates clean, separated logs:

```
================================================================================  ← Start marker
[TIMESTAMP]
[ENDPOINT] ► START MESSAGE
...operation logs...
[ENDPOINT] ✓ COMPLETE
================================================================================  ← End marker
```

This makes it easy to scan multiple transactions.

---

## 🔧 Endpoints With Logging

All these endpoints now have comprehensive logging:

### Transaction Routes
- `POST /api/transactions/test-payment/:method`
- `POST /api/transactions/purchase`

### Lipana Routes
- `POST /api/lipana/test-payment`
- `POST /api/lipana/test-payment-method/:method`
- `GET /api/lipana/status/:txId`
- `POST /api/lipana/webhook`

---

## 💡 Tips for Debugging

1. **Look for mismatched Before/After coins**
   - Shows if update worked

2. **Check email "sent" confirmation**
   - If not present, email failed

3. **Watch total time**
   - Unusually slow? Database issue?

4. **Verify Transaction ID**
   - Should be in both logs and database

5. **Match user email**
   - Verify correct user was updated

---

## 📝 Example: Full Transaction Trace

```
User runs: .\test-all-methods.ps1 -UserId "507f1f77bcf86cd799439011"

Backend logs EVERY payment:
  Stripe → see: [stripe] emails sent
  PayPal → see: [paypal] emails sent
  Apple Pay → see: [apple_pay] emails sent
  ... etc for all 7 methods

Each transaction shows:
  ✓ User coins before/after
  ✓ Email sent confirmation
  ✓ Processing time
  ✓ Any errors
```

---

## 🎯 Production Deployment

For production, consider:

1. **Log Level Control** (add to .env)
   ```
   LOG_LEVEL=info  # or debug, warn, error
   ```

2. **Log Rotation** (keep logs from growing too large)
   ```
   npm install winston  # Professional logging
   ```

3. **Log Aggregation** (centralized logging)
   ```
   Use: Datadog, ELK Stack, Splunk, etc.
   ```

4. **Sensitive Data** (redact emails in logs)
   ```
   Show: john@...com instead of john@example.com
   ```

---

## ✅ Verification Checklist

When testing transactions, check logs for:

- [ ] Payment request received
- [ ] Package validated and found
- [ ] Transaction created with ID
- [ ] User found with correct email
- [ ] Coins/Premium updated correctly
- [ ] User saved to database
- [ ] Transaction marked COMPLETED
- [ ] Email sent successfully
- [ ] Processing time shown
- [ ] No error markers (✗) at end
