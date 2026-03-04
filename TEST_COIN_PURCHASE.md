# Test Coin Purchase Email Delivery

## Step 1: Get a Valid User ID

First, check your MongoDB for an existing user:

```powershell
# Using MongoDB CLI
mongosh mongodb://localhost:27017/datingapp
> db.users.findOne({}, { _id: 1, email: 1, name: 1 })
```

Or if using Atlas:
```powershell
mongosh "mongodb+srv://..."
> db.users.findOne({}, { _id: 1, email: 1, name: 1 })
```

**Copy the `_id` value** - you'll need this for testing.

---

## Step 2: Make Test Payment #1 - Coin Purchase

Replace `YOUR_USER_ID` with the actual user ID from step 1:

```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "coins_50"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Expected Response:**
```json
{
  "ok": true,
  "transactionId": "uuid-here",
  "message": "Test payment processed successfully and confirmation email sent"
}
```

**What happens:**
- ✅ 50 coins added to user account
- ✅ Confirmation email sent to user's registered email
- ✅ Check Brevo dashboard for sent email

---

## Step 3: Make Test Payment #2 - Premium Upgrade

```powershell
$userId = "YOUR_USER_ID"
$body = @{
    userId = $userId
    packageId = "premium_1m"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Expected Response:**
```json
{
  "ok": true,
  "transactionId": "uuid-here",
  "message": "Test payment processed successfully and confirmation email sent"
}
```

**What happens:**
- ✅ User marked as premium (expires in 1 month)
- ✅ Premium confirmation email sent to user's registered email
- ✅ Check Brevo dashboard for sent email

---

## Step 4: Verify Emails in Brevo

1. **Log in to [Brevo Dashboard](https://app.brevo.com)**
2. **Go to:** Transactional → Emails → Sent
3. **Look for:**
   - Email to user's address with subject "Coin Purchase Confirmation"
   - Email to user's address with subject "Premium Membership Activated"

---

## Alternative: Using curl (Linux/Mac/Git Bash)

```bash
# Test 1: Coin Purchase
curl -X POST http://localhost:5000/api/lipana/test-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "packageId": "coins_50"
  }'

# Test 2: Premium Upgrade
curl -X POST http://localhost:5000/api/lipana/test-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "packageId": "premium_1m"
  }'
```

---

## Available Test Packages

| Package ID | Description | Price |
|-----------|-----------|-------|
| `coins_50` | 50 coins | $4.99 |
| `coins_100` | 100 coins | $9.99 |
| `coins_250` | 250 coins | $19.99 |
| `coins_500` | 500 coins | $29.99 |
| `premium_1m` | 1 Month premium | $4.99 |
| `premium_3m` | 3 Months premium | $12.99 |
| `premium_6m` | 6 Months premium | $19.99 |
| `premium_12m` | 12 Months premium | $29.99 |

---

## Server Logs to Check

Run your backend and look for these logs:

```
[LIPANA /test-payment] Coin purchase email sent to: user@example.com
[LIPANA /test-payment] Premium upgrade email sent to: user@example.com
```

If you see these, emails were successfully triggered!

---

## Troubleshooting

### Email not sent?
- Check Brevo API key is correct in `.env`
- Verify template IDs 7 and 8 exist in Brevo
- Check server logs for errors

### User not found?
- Verify the userId exists in MongoDB
- Make sure you replaced `YOUR_USER_ID` with an actual ID

### Connection refused?
- Ensure backend is running: `npm start` in `backend/` folder
- Verify MongoDB is running
