# End-to-End Coin Purchase Testing Guide

## Prerequisites
- MongoDB running locally or connected
- Backend server running
- Frontend dev server running
- Brevo templates 7 & 8 created and published

---

## Part 1: Start the Services

### Terminal 1 - MongoDB (if using local)
```powershell
mongosh mongodb://localhost:27017/datingapp
```

### Terminal 2 - Backend Server
```powershell
cd "c:\Users\SEAL TEAM\Documents\DATING\Datingapp-1\backend"
npm start
```

**Expected output:**
```
[DEBUG] LIPANA_SECRET_KEY exists: true
[DEBUG] LIPANA_ENVIRONMENT: production
✓ Backend running on http://localhost:5000
```

### Terminal 3 - Frontend Dev Server
```powershell
cd "c:\Users\SEAL TEAM\Documents\DATING\Datingapp-1"
npm run dev
```

**Expected output:**
```
➜ Local: http://localhost:5173/
```

---

## Part 2: Access the App

### Step 1: Open Browser
Navigate to: **http://localhost:5173**

### Step 2: Create Test User (if needed)
1. Click "Sign Up"
2. Fill in:
   - Email: `test@example.com`
   - Password: `Test123!`
   - Name: `Test User`
3. Accept Terms & Privacy
4. Complete Profile Setup (Age, Location, Bio, Interests)

**Important:** Note the user ID from browser DevTools or database query.

### Step 3: Log In
If already have account, just log in with existing credentials.

---

## Part 3: Access Coin Purchase (Two Methods)

### Method A: Through Profile Settings
1. **Mobile:** Tap menu (☰) → Profile Settings
2. **Desktop:** Click profile icon → Settings
3. Look for "Buy Coins" or "Add Coins" button
4. Click to open coin shop

### Method B: Direct API Call (for testing)
If profile doesn't have visible coin purchase UI yet, use test endpoint directly:

```powershell
# Get your User ID from database first
$userId = "USER_ID_FROM_DB"

# Test endpoint that doesn't require payment
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    userId = $userId
    packageId = "coins_50"
  } | ConvertTo-Json)

$response.Content | ConvertFrom-Json
```

---

## Part 4: Make Test Payment #1 (Coins)

### Via Frontend (if UI exists):
1. Click "Buy Coins" button
2. Select "50 Coins - $4.99" package
3. Click "Purchase"
4. **Note:** For test mode, just skip payment confirmation

### Via Backend Test Endpoint:
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_50"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

Write-Output $response.Content
```

### Expected Response:
```json
{
  "ok": true,
  "transactionId": "uuid-xxxxx",
  "message": "Test payment processed successfully and confirmation email sent"
}
```

**What happens automatically:**
- ✅ User coins updated (+50)
- ✅ Confirmation email sent
- ✅ Transaction recorded in MongoDB

---

## Part 5: Verify Changes

### Check 1: Coins Updated in App
1. **Refresh browser** (or check Network tab)
2. **Profile → Coins**: Should show +50 coins
3. **Navigation bar**: Should display updated coin count

### Check 2: Coins in Database
```powershell
mongosh mongodb://localhost:27017/datingapp

# Check user's coins
> db.users.findOne({_id: ObjectId("YOUR_USER_ID")}, {coins: 1, email: 1, name: 1})

# Should show: { coins: 50, email: "...", name: "..." }
```

### Check 3: Transaction in Database
```powershell
# View transaction record
> db.transactions.findOne({userId: "YOUR_USER_ID"})

# Should show:
# {
#   id: "uuid",
#   userId: "...",
#   type: "COIN_PURCHASE",
#   amount: 50,
#   price: "$4.99",
#   method: "test",
#   status: "COMPLETED",
#   createdAt: Date
# }
```

### Check 4: Email Sent
1. **Brevo Dashboard** → Transactional → Emails → Sent
2. **Look for:** Email to user with subject containing "Coin"
3. **Verify:** Shows 50 coins, $4.99, transaction ID

---

## Part 6: Make Test Payment #2 (Premium)

### Via Test Endpoint:
```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "premium_1m"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

Write-Output $response.Content
```

**What happens:**
- ✅ `user.isPremium = true`
- ✅ Premium confirmation email sent
- ✅ Transaction recorded

### Verify Premium Status:
```powershell
# Database
> db.users.findOne({_id: ObjectId("YOUR_USER_ID")}, {isPremium: 1})
# Should show: { isPremium: true }

# App (should show "Premium" badge in profile)
```

---

## Part 7: Check Server Logs

### Terminal with Backend Running
Look for these success messages:

```
[LIPANA /test-payment] Coin purchase email sent to: user@example.com
[LIPANA /test-payment] Premium upgrade email sent to: user@example.com
[Brevo] Coin purchase email sent successfully: messageId
```

If you see these, **emails are working!**

---

## Troubleshooting

### ❌ "User not found"
- Verify userId exists in database
- Make sure you replaced `YOUR_USER_ID` placeholder
- Format: ObjectId string (24 hex chars)

### ❌ No email received
**Check Brevo:**
1. Template 8 exists and is published
2. Template 7 exists and is published
3. API key in `.env` is correct
4. Check Brevo spam folder

**Check Backend Logs:**
```
[WARN transactions.purchase] Email sending failed: ...
[Brevo] Failed to send coin purchase email: ...
```

### ❌ Coins not updating
- Refresh browser page
- Check MongoDB user record
- Verify transaction was created with status "COMPLETED"

### ❌ Backend won't start
```powershell
# Clear cache and reinstall
cd backend
rm -r node_modules
npm install
npm start
```

### ❌ Frontend can't connect to backend
- Verify backend running on `http://localhost:5000`
- Check `.env` CORS settings
- Check browser DevTools Network tab for failed API calls

---

## Available Test Packages

Use these `packageId` values for testing:

```
coins_50    → 50 coins for $4.99
coins_100   → 100 coins for $9.99
coins_250   → 250 coins for $19.99
coins_500   → 500 coins for $29.99

premium_1m  → 1 Month premium for $4.99
premium_3m  → 3 Months premium for $12.99
premium_6m  → 6 Months premium for $19.99
premium_12m → 12 Months premium for $29.99
```

---

## Quick Reference: User IDs

Get a test user ID from database:

```powershell
mongosh mongodb://localhost:27017/datingapp
> db.users.findOne({}, {_id: 1, name: 1, email: 1})
# Result: { _id: ObjectId("..."), name: "...", email: "..." }
```

Copy the `_id` value - use for `userId` in test requests.
