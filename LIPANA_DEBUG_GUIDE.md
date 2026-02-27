# Lipana Payment Backend Debugging Guide

## Overview

The Lipana payment routes now include comprehensive debugging information that logs every step of the payment process. This guide explains what logs to look for when testing the M-Pesa/Lipana payment flow.

---

## Log Prefixes

All Lipana logs use specific prefixes for easy filtering:

- `[LIPANA /initiate]` - STK push initiation request
- `[LIPANA /status]` - Payment status polling
- `[LIPANA /webhook]` - Webhook event handling
- `[LIPANA /packages]` - Package list requests
- `[LIPANA /history]` - Transaction history requests
- `[LIPANA STUB]` - Mock M-Pesa STK push simulation
- `[PHONE_NORMALIZE]` - Phone number validation and normalization

---

## Payment Flow: Expected Logs

### 1. **Initiation Request** (`POST /api/lipana/initiate`)

**Frontend sends:**
```
{
  userId: "user-123",
  phone: "0703147873",    // or "254703147873"
  packageId: "coins_50"
}
```

**Expected backend logs:**

```
[LIPANA /initiate] === START REQUEST ====
[LIPANA /initiate] Received request: {
  userId: "user-123",
  phone: "07031...73",
  packageId: "coins_50",
  timestamp: "2026-02-27T..."
}
[LIPANA /initiate] Validation complete
[LIPANA /initiate] Package validated: { packageId: "coins_50", coins: 50, price: "$4.99" }
[LIPANA /initiate] Normalizing phone: '0703147873'
[PHONE_NORMALIZE] Input: '0703147873'
[PHONE_NORMALIZE] After removing non-digits: '0703147873' (length: 10)
[PHONE_NORMALIZE] Kenya format detected: 0XXXXXXXXX -> 254703147873
[LIPANA /initiate] Phone normalized: '0703147873' → '254703147873'
[LIPANA /initiate] Transaction created: {
  txId: "abc-def-123",
  userId: "user-123",
  type: "COIN_PURCHASE",
  amount: 50,
  phone: "254703147873",
  status: "PENDING"
}
[LIPANA /initiate] Initiating STK push...
[LIPANA STUB] STK Push initiated: {
  txId: "abc-def-123",
  phone: "25470...73",
  amount: 1,
  currency: "USD",
  checkoutRequestID: "ws_CO_1709018400123",
  responseCode: "0"
}
[LIPANA STUB] Session stored with PENDING status for txId: abc-def-123
[LIPANA /initiate] STK push initiated: { checkoutRequestID, responseCode, responseDescription, customerMessage }
[LIPANA /initiate] === SUCCESS === (250ms)
```

---

### 2. **Frontend Polling** (`GET /api/lipana/status/:txId`)

Frontend polls every 5 seconds after payment initiation to check status.

**Expected logs Timeline:**

**First poll (immediately):**
```
[LIPANA /status] === CHECK STATUS ==== txId: abc-def-123
[LIPANA /status] Looking up transaction: abc-def-123
[LIPANA /status] Transaction loaded: {
  txId: "abc-def-123",
  userId: "user-123",
  type: "COIN_PURCHASE",
  amount: 50,
  currentStatus: "PENDING",
  phone: "25470...73"
}
[LIPANA /status] STK session check: {
  sessionExists: true,
  sessionStatus: "PENDING",
  checkoutRequestID: "ws_CO_...",
  createdAt: "2026-02-27T..."
}
[LIPANA /status] Session status is 'PENDING', waiting for completion...
[LIPANA /status] === RESPONSE === (50ms)
  status: "pending",
  statusChanged: false,
  coins: 50,
  isPremium: false
```

**Polls 2-3 (5-10 seconds):** Similar, still "PENDING"

**After 3 seconds auto-complete - STK Stub transitions to SUCCESS:**
```
[LIPANA STUB] *** AUTO-COMPLETE (3s elapsed) *** txId: abc-def-123
[LIPANA STUB] Session status: PENDING -> SUCCESS
```

**Next poll (at 15 seconds) - SUCCESS detected:**
```
[LIPANA /status] === CHECK STATUS ==== txId: abc-def-123
[LIPANA /status] Looking up transaction: abc-def-123
[LIPANA /status] Transaction loaded: { ... currentStatus: "PENDING" ... }
[LIPANA /status] STK session check: {
  sessionExists: true,
  sessionStatus: "SUCCESS",      <-- CHANGED!
  checkoutRequestID: "...",
  createdAt: "..."
}
[LIPANA /status] ✓ Payment success detected! Updating transaction...
[LIPANA /status] Transaction status updated: PENDING → COMPLETED
[LIPANA /status] Updating user user-123...
[LIPANA /status] User coins updated: 100 → 150    <-- Coins added
[LIPANA /status] User saved successfully
[LIPANA /status] === RESPONSE === (100ms)
  status: "success",      <-- Now SUCCESS!
  statusChanged: true,
  coins: 50,
  isPremium: false
```

---

### 3. **Transaction History** (`GET /api/lipana/history/:userId`)

```
[LIPANA /history] === LOAD HISTORY ==== userId: user-123
[LIPANA /history] Fetching transaction history...
[LIPANA /history] Transactions loaded: {
  userId: "user-123",
  count: 1,
  transactions: [
    {
      txId: "abc-def-123",
      type: "COIN_PURCHASE",
      amount: 50,
      status: "COMPLETED",
      method: "momo",
      createdAt: "2026-02-27T..."
    }
  ]
}
[LIPANA /history] === SUCCESS === (80ms)
```

---

## Debugging Common Issues

### Issue: Phone Number Rejected

**Log Check:**
Look for `[PHONE_NORMALIZE]` logs:

```
[PHONE_NORMALIZE] Input: '0703147873'
[PHONE_NORMALIZE] After removing non-digits: '0703147873' (length: 10)
[PHONE_NORMALIZE] Kenya format detected: 0XXXXXXXXX -> 254703147873
```

✅ **Good:** Shows successful conversion to Kenya format (254)

❌ **Bad:** 
```
[PHONE_NORMALIZE] Invalid format: {
  input: '123',
  cleaned: '123',
  length: 3,
  ...
}
```

**Solutions:**
- Use 10-digit Kenya numbers: `0701234567` or `0711234567`
- Or use full international: `254701234567`
- Avoid: `70123456` (only 8 digits), `2704000000` (wrong prefix)

---

### Issue: Transaction Not Found

**Log Check:**
```
[LIPANA /status] Transaction NOT FOUND: abc-def-123
[LIPANA /status] === RESPONSE === (30ms)
  status: 404 error
```

**Solutions:**
- Verify transactionId is correct (from initiate response)
- Check if transaction was actually created (look for "Transaction created" log)
- Check MongoDB connection

---

### Issue: STK Session Not Found

**Log Check:**
```
[LIPANA /status] STK session check: {
  sessionExists: false,
  sessionStatus: "NO SESSION"
}
```

**Solutions:**
- Session might have expired (in-memory Map is lost on server restart)
- Transaction was created but STK push failed
- Check "STK Push initiated" log - was it called?

---

### Issue: Payment Never Completes

**Log Check:**
After 15+ seconds, still see:
```
[LIPANA /status] Session status is 'PENDING', waiting for completion...
```

**Debugging Steps:**

1. **Check if STK was initiated:**
   Search for `[LIPANA STUB] STK Push initiated` log
   - If yes: Problem might be session state
   - If no: initiate endpoint failed

2. **Check if auto-complete fired:**
   Look for `[LIPANA STUB] *** AUTO-COMPLETE` log
   - If yes: Auto-complete worked, but status update might have failed
   - If no: Check server logs for timeouts (very rare)

3. **Check if status update succeeded:**
   Look for `[LIPANA /status] Transaction status updated: PENDING → COMPLETED`
   - If no: Transaction save might have failed

---

## Performance Metrics

All logs include execution time in milliseconds:

```
[LIPANA /initiate] === SUCCESS === (250ms)  <-- Total time to initiate
[LIPANA /status] === RESPONSE === (50ms)    <-- Time to check status
```

**Expected ranges:**
- **/initiate:** 100-300ms (depending on DB)
- **/status:** 50-150ms (quick DB lookup)
- **/history:** 100-200ms (20 transactions)

**> 500ms suggests:**
- Database connection slow
- Network latency
- Server CPU-bound
- Missing database indexes

---

## Key Log Timestamps

To trace exact request-response time:

```
[LIPANA /initiate] Received request: { timestamp: "2026-02-27T14:30:45.123Z" }
...
[LIPANA /initiate] === SUCCESS === (250ms)  <-- Started at 14:30:45.123, ended at 14:30:45.373
```

---

## Configurable Debugging

### Auto-Complete Timing

To change the 3-second auto-complete simulation, find in `lipana.js`:

```javascript
setTimeout(() => {
  // Auto-complete happens here
}, 3000);  // Change this value
```

- Use `1000` (1 second) for faster testing
- Use `0` for instant completion
- Use real Lipana SDK when ready for production

---

## Database Issues to Watch

If you see errors like:

```
[LIPANA /initiate] === ERROR === (450ms)
  error: "Transaction.save is not a function"
```

Check:
1. Transaction model is properly imported
2. MongoDB connection is active
3. Transaction schema is defined

---

## Testing the Full Flow

### Step-by-step with logs:

1. **Open backend logs** (terminal where `npm start` runs)
2. **Frontend:** Go to Profile → Coins → Select "Mobile Money"
3. **Frontend:** Enter phone: `0703147873`
4. **Watch logs:** Should see `[LIPANA /initiate]` block
5. **Frontend:** Click "Pay"
6. **Frontend:** Processing spinner shows (3 seconds)
7. **Watch logs:** Should see `[LIPANA STUB] *** AUTO-COMPLETE` log
8. **Watch logs:** Should see polling logs with `[LIPANA /status]`
9. **Frontend:** SUCCESS screen appears
10. **Watch logs:** Final log shows `status: "success", statusChanged: true`

---

## Quick Filter Commands

### See all Lipana logs:
```bash
# In terminal (grep available on Windows with Git Bash or WSL)
npm start 2>&1 | grep LIPANA
```

### See only errors:
```bash
npm start 2>&1 | grep "ERROR\|✗\|❌"
```

### See only success:
```bash
npm start 2>&1 | grep "SUCCESS\|✓"
```

---

## Still Debugging?

Check these in order:

1. **[LIPANA /initiate] === START REQUEST** - Does it exist? ✓
2. **[LIPANA /initiate] Package validated** - Is packageId correct? ✓
3. **[PHONE_NORMALIZE]** - Does phone normalize correctly? ✓
4. **[LIPANA /initiate] Transaction created** - Is txId created? ✓
5. **[LIPANA STUB] STK Push initiated** - Is STK called? ✓
6. **[LIPANA STUB] *** AUTO-COMPLETE** - Does auto-complete fire? ✓
7. **[LIPANA /status] Transaction loaded** - Can we find tx later? ✓
8. **[LIPANA /status] ✓ Payment success detected** - Does status update work? ✓
9. **[LIPANA /status] User [...] received X coins** - Does user update work? ✓

If any step is missing, that's where the issue is.

---

## Next Steps: Real Integration

To replace the stub with real Lipana/M-Pesa:

1. Install official Lipana SDK: `npm install lipana-sdk`
2. Replace `initiateStkPush` function with real API call
3. Implement webhook verification (HMAC signature)
4. Re-enable authMiddleware on protected routes
5. Test with real Safaricom M-Pesa sandbox

The debug logs will still work with real integration!
