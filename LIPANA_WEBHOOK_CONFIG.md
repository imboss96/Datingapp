# Lipana Webhook Configuration Guide

## Issue
Payments are being created but the transaction status is not being auto-processed because the webhook from Lipana is not being received.

## Root Causes to Check

1. **Webhook URL not configured in Lipana Dashboard**
2. **Webhook Secret mismatch**
3. **Network/firewall blocking Lipana's requests**
4. **Incorrect event type mapping**

## Solution Steps

### Step 1: Verify Webhook Configuration in Lipana Dashboard
Go to your Lipana merchant dashboard:
- Navigate to **Settings** → **Webhooks** or **API Configuration**
- Ensure webhook URL is set to: `https://www.lunesalove.com/api/lipana/webhook`
- Copy the webhook secret and verify it matches your current setup

### Step 2: Verify Current Configuration  
Your backend `.env` has:
```
LIPANA_WEBHOOK_URL=https://www.lunesalove.com/api/lipana/webhook
LIPANA_WEBHOOK_SECRET=c0ea962e8e888ef91e1e3ef26904ffa9d30e6ed756f5a47c2296d62eedaa1ab3
```

### Step 3: Update Lipana Dashboard
1. Log in to https://platform.lipana.app (or your Lipana merchant portal)
2. Go to **Settings** → **Webhooks**
3. Add/Update webhook URL:
   - **URL:** `https://www.lunesalove.com/api/lipana/webhook`
   - **Secret:** `c0ea962e8e888ef91e1e3ef26904ffa9d30e6ed756f5a47c2296d62eedaa1ab3`
   - **Events to subscribe:** 
     - `payment.success`
     - `payment.failed`
     - `payment.cancelled`
     - OR `transaction.success`, `transaction.failed`, `transaction.cancelled`

### Step 4: Test Webhook
1. In Lipana merchant dashboard, find the **Webhook Testing** or **Send Test Event** option
2. Send a test `payment.success` event
3. Check server logs: `ssh root@103.241.67.116 "pm2 logs datingapp --nostream --lines 50 | grep WEBHOOK"`
4. You should see: `[LIPANA /webhook] === WEBHOOK EVENT ====`

### Step 5: Verify Event Type Mapping
The webhook handler accepts these event types:
- ✓ `payment.success` / `transaction.success` → Status: COMPLETED
- ✓ `payment.failed` / `transaction.failed` → Status: FAILED  
- ✓ `payment.cancelled` / `transaction.cancelled` → Status: CANCELLED

## How Webhook Payment Processing Works

```
1. User initiates payment → Transaction created (status: PENDING)
2. User completes M-Pesa/payment
3. Lipana calls webhook with transaction status
4. Backend verifies signature with LIPANA_WEBHOOK_SECRET
5. Backend updates transaction status in database
6. Backend updates user coins/premium status
7. Transaction auto-completes
```

## Server Verification Checklist

✅ Backend API responding: `https://www.lunesalove.com/api/health`
✅ Webhook endpoint accessible: `https://www.lunesalove.com/api/lipana/webhook`
✅ Server has all dependencies
✅ Environment variables loaded

## If Still Not Working

1. **Check PM2 logs for errors:**
   ```bash
   ssh root@103.241.67.116
   pm2 logs datingapp
   ```

2. **Verify webhook is being called:**
   ```bash
   pm2 logs datingapp --nostream | grep WEBHOOK
   ```

3. **Check signature verification:**
   ```bash
   pm2 logs datingapp --nostream | grep "Signature"
   ```

4. **Manually test webhook with curl:**
   ```bash
   ssh root@103.241.67.116
   curl -X POST http://localhost:5000/api/lipana/webhook \
     -H 'Content-Type: application/json' \
     -H 'X-Lipana-Signature: test' \
     -d '{"event":"payment.success","data":{"transactionId":"test123"}}'
   ```

## Important Notes

- The webhook **must be called from Lipana's servers** (cannot test from localhost/ngrok)
- Domain must be **public and reachable** (https://www.lunesalove.com ✓)
- **Webhook URL must use HTTPS** (not HTTP)
- The signature secret must match exactly
- Server is currently working and ready to receive webhooks
