# Email Deliverability Verification Guide

Now that we've confirmed the **backend is sending emails correctly**, let's verify they're actually reaching the inbox.

---

## Step 1: Check Gmail Spam Folder (Most Common)

Many transactional emails end up in spam. Try this:

1. **Go to Gmail**: `https://mail.google.com`
2. **Login to**: `jeffnjoki56@gmail.com`
3. **Click "Spam"** in the left sidebar
4. **Search for emails from**:
   - Subject containing: "coin", "purchase", "payment", "confirmation", "lunesalove"
   - From: any address containing "brevo", "mailin", "lunesalove"

If you find emails there:
- ✅ **Success!** Emails ARE being sent and delivered
- Click the email → "Report not spam"
- Mark as "Move to Inbox"

---

## Step 2: Check Brevo Dashboard

Log into your Brevo account to see delivery status:

1. **Go to**: `https://app.brevo.com`
2. **Login with**: joshuanyandieka3@gmail.com (the admin account)
3. **Navigate to**: "Transactional" → "Logs"
4. **Look for recent emails** with:
   - Recipients: `jeffnjoki56@gmail.com`
   - Templates: 7 (Coin Purchase) or 8 (Premium)
   - Time: Today

### Possible Statuses You'll See:

| Status | Meaning | Action |
|--------|---------|--------|
| **Sent** | Email sent to ISP | Normal - waiting for delivery |
| **Delivered** | ISP confirmed receipt | ✅ Likely in inbox or spam |
| **Opened** | Recipient opened email | ✅✅ Successfully received |
| **Clicked** | Recipient clicked link | ✅✅✅ Fully engaged |
| **Bounced** | ISP rejected email | ❌ Invalid recipient or ISP filtering |
| **Spam** | Marked as spam by ISP | ⚠️ Sender reputation issue |
| **Queued** | Still in sending queue | Wait a few more minutes |
| **Failed** | Error sending | Check error details |

---

## Step 3: Monitor Recent Transactions

Check that **transactions are being created in database**:

```bash
# Connect to MongoDB
mongosh

# Use database
use datingapp

# Check recent transactions
db.transactions.find().sort({createdAt: -1}).limit(5)

# Look for records with:
# - type: "COIN_PURCHASE" or "PREMIUM_UPGRADE"
# - status: "COMPLETED"
# - userId: ObjectId("69a781980b890ec4c251bdfd")
# - method: "test" or "stripe"
```

---

## Step 4: Backend Logs Verification

Backend logs show email sending in real-time. Check for messages like:

```
[LIPANA /test-payment] User received 50 coins
[Brevo] sendCoinPurchaseEmail START
[✓Brevo] Coin purchase email sent successfully
Message ID: <202603040642...@smtp-relay.mailin.fr>
```

If you see ✓ checkmarks:
- ✅ Payment processed
- ✅ Email sent to Brevo
- ✅ Brevo confirmed receipt (201 response)

---

## Step 5: Manual Backend Test

If you want to trigger another test payment:

### Option A: Using Curl
```bash
# Test coin purchase
curl -X POST http://localhost:5000/api/lipana/test-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69a781980b890ec4c251bdfd",
    "packageId": "coins_50"
  }'

# Response should show:
# "ok": true,
# "emailSent": true,
# "emailError": null
```

### Option B: Using PowerShell
```powershell
$body = ConvertTo-Json @{
    userId = "69a781980b890ec4c251bdfd"
    packageId = "coins_100"
}

Invoke-WebRequest `
    -Uri "http://localhost:5000/api/lipana/test-payment" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

### Option C: Using Frontend
1. Go to `http://localhost:3001`
2. Login with test account
3. Go to Shop/Coins section
4. Click "Buy Coins"
5. Complete payment
6. Check for "Confirmation email sent" message
7. Check email inbox

---

## Step 6: Check Email Headers (Advanced)

If email appears in inbox, check its authenticity:

In Gmail:
1. Open the email from lunesalove
2. Click three dots **⋮** → "Show original"
3. Look for:
   ```
   Authentication-Results: ✓ PASS (SPF, DKIM, DMARC)
   From: admin@lunesalove.com
   X-Mailer: Brevo-SMTP
   X-Brevo-MID: <202603040642...>
   ```

---

## Step 7: Brevo Account Health Check

Make sure Brevo account is in good standing:

1. **Go to**: `https://app.brevo.com/dashboard`
2. **Check**:
   - ✅ Account active and not suspended
   - ✅ Sender domain verified (lunesalove.com)
   - ✅ SMTP credentials working
   - ✅ Sending limits not reached
   - ✅ User reputation score (should be > 80%)
   - ✅ No bounce rate warnings

### Sender Verification
- Go to "Senders & signatures"
- Confirm `admin@lunesalove.com` is verified
- Check domain `lunesalove.com` is authenticated

---

## Common Issues & Solutions

### Issue 1: Emails in Spam
**Symptoms**: Emails appear in spam folder  
**Causes**: 
- Brevo IP reputation not established
- Domain not verified in Brevo
- Content flags (links, attachments)

**Solutions**:
```
1. Whitelist sender in gmail: admin@lunesalove.com
2. Check Brevo domain verification
3. Review email content for spam triggers
4. Monitor Brevo reputation score
```

### Issue 2: Emails with "Queued" Status
**Symptoms**: Brevo shows "Queued" for hours  
**Causes**:
- Brevo rate limiting
- Brevo SMTP queue backed up
- Account restrictions

**Solutions**:
```
1. Check account limits in Brevo
2. Contact Brevo support
3. Try resubmitting email test
```

### Issue 3: "Bounced" Status in Brevo
**Symptoms**: All emails showing as bounced  
**Causes**:
- Recipient email doesn't exist
- ISP rejected message (invalid format)
- Account authentication issue

**Solutions**:
```
1. Verify recipient email is correct: jeffnjoki56@gmail.com
2. Test sending from Brevo web interface directly
3. Check .env variables for template configuration
```

### Issue 4: Backend Not Sending Emails
**Symptoms**: Backend logs don't show email sending  
**Causes**:
- Email function not imported
- sendCoinPurchaseEmail() throwing exception
- Brevo API key incorrect

**Solutions**:
```bash
# Verify imports
grep -n "sendCoinPurchaseEmail" backend/routes/lipana.js

# Check .env values
grep "BREVO_" backend/.env

# Verify API key is not empty
grep "BREVO_API_KEY=" backend/.env | grep -v "^#"
```

---

## Performance Expectations

Based on testing:

| Metric | Value |
|--------|-------|
| Payment Processing Time | < 100ms |
| Email Send Time | 200-500ms |
| Total Response Time | 300-600ms |
| Brevo API Response | ~200ms (HTTP 201) |
| Coins Update | Immediate (< 50ms) |
| Backend Stay Alive | ✅ No crashes |

---

## Debugging Flow

If email not received, follow this sequence:

```
1. Check Gmail Spam folder
   └─> Found? ✅ Delivery working, just in spam
   └─> Not found? → Continue

2. Check Brevo dashboard "Logs"
   └─> Status "Delivered"? ✅ ISP received it
   └─> Status "Bounced"? ❌ Recipient or format issue
   └─> Status "Sent"? → Wait more time or check logs

3. Check backend logs
   └─> See "Message ID"? ✅ Backend sent it
   └─> See error? ❌ Backend issue - check terminal
   └─> No log? ❌ Endpoint not called

4. Check database
   └─> Transaction record exists? ✅ Payment processed
   └─> Transaction COMPLETED? ✅ Payment success
   └─> User coins updated? ✅ DB update worked

5. If all ✅ but email not in inbox
   └─> ISP/spam filter blocking
   └─> Contact Brevo support
```

---

## Questions to Answer

Before concluding there's an issue, ask:

1. ✅ Can you see a transaction in the database for this payment?
2. ✅ Does the user's coin balance increase after payment?
3. ✅ Does the backend log show the email was sent?
4. ✅ Did you check the spam folder?
5. ✅ Is Brevo dashboard showing delivery status?
6. ✅ Is the email address correct (jeffnjoki56@gmail.com)?
7. ✅ Has email been received before from this sender?
8. ✅ Is the email account set to receive transactional emails?

---

## Support Resources

- **Brevo Docs**: https://docs.brevo.com/docs/transactional-email
- **Brevo Status**: https://status.brevo.com
- **Gmail Spam Help**: https://support.google.com/mail/answer/1366776
- **Email Headers**: https://support.google.com/mail/answer/29436
- **SPF/DKIM/DMARC Guide**: https://docs.brevo.com/docs/set-up-authentication

---

## Current Test Results Summary

Last Test (Date: Today):
- ✅ Payment 1: 50 coins → Email sent, Message ID: `<202603040642.37035314036@smtp-relay.mailin.fr>`
- ✅ Payment 2: 100 coins → Email sent, Message ID: `<202603040642.41221543850@smtp-relay.mailin.fr>`
- ✅ Payment 3: Stripe method → Email sent, Message ID: `<202603040642.75577762692@smtp-relay.mailin.fr>`

Backend Status: **HEALTHY ✅**
- Transactions created: ✅
- Database updated: ✅
- Emails sent to Brevo: ✅
- No crashes: ✅
- Response times normal: ✅
