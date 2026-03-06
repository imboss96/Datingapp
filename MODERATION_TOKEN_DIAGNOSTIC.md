# Moderation Token Diagnostic Guide 🔐

## Problem
Moderation standalone works locally but fails on hosted server with "invalid token" error. The unreplied and replied chat sections don't load data.

## Root Causes (in order of likelihood)

### 1. **JWT_SECRET Mismatch** ⚠️ (Most Likely)
- Token generated with one `JWT_SECRET` cannot be verified with a different `JWT_SECRET`
- This happens when `.env` files differ between local and hosted servers

**Solution:**
```bash
# On HOSTED SERVER - Verify JWT_SECRET matches local
# Check your cloud deployment (Heroku, Railway, AWS, etc.) environment variables
# The JWT_SECRET must be IDENTICAL to your local .env file

# Current local JWT_SECRET:
JWT_SECRET=dev_secret_key_change_in_production

# ⚠️ For production, use a STRONG random secret!
# Generate one:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. **Authorization Header Not Being Sent**
- CORS might be stripping headers on hosted version
- Firewall/proxy might be removing the Authorization header

### 3. **Token Expired**
- Tokens are set to expire in 7 days
- Check token expiry in browser console

---

## 🔧 Quick Diagnostic Steps

### Step 1: Check Token in Browser
```javascript
// Open browser DevTools Console on the hosted site
// Run this:
console.log('Token:', localStorage.getItem('moderationToken'));
console.log('Token Length:', localStorage.getItem('moderationToken')?.length);

// Copy the token and check when it expires:
const token = localStorage.getItem('moderationToken');
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token Payload:', payload);
    console.log('Expires At:', new Date(payload.exp * 1000));
  }
}
```

### Step 2: Test Auth Endpoint
```bash
# Replace <TOKEN> with your actual token from localStorage
# Run on HOSTED server (e.g., https://lunesalove.com)

curl -X GET https://lunesalove.com/api/moderation/debug/auth-status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"

# Should return:
# {
#   "success": true,
#   "authenticated": true,
#   "userId": "...",
#   "userRole": "MODERATOR",
#   "message": "Token is valid. Authentication working correctly!"
# }

# If you get "Invalid token" error, then JWT_SECRET is different
```

### Step 3: Verify Backend .env Configuration
```bash
# SSH into your hosted server and check:
cat backend/.env | grep JWT_SECRET

# It MUST match your local:
# JWT_SECRET=dev_secret_key_change_in_production

# If it's different, update it to match
```

---

## 🚀 Complete Fix for Hosted Server

### Option A: Using Environment Variables
```bash
# For most cloud platforms (Heroku, Railway, Render, etc.):

# 1. Set the JWT_SECRET in your platform's environment variables
# Make sure it matches EXACTLY with your local .env

# Example for Heroku:
heroku config:set JWT_SECRET=dev_secret_key_change_in_production

# Example for Railway:
# Go to Project → Variables → Add
# Key: JWT_SECRET
# Value: dev_secret_key_change_in_production
```

### Option B: Update .env File on Server
```bash
# SSH into your hosted server
ssh user@your-server.com

# Navigate to project
cd /path/to/Datingapp-1/backend

# Edit .env file
nano .env

# Make sure JWT_SECRET line is:
# JWT_SECRET=dev_secret_key_change_in_production

# Save and restart backend
npm run dev
# OR if using PM2:
pm2 restart datingapp-backend
```

### Option C: For Production (Recommended)
```bash
# Generate a strong random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# 8f4a9c2e1b5d7f3a9e6c8b2d5f1a4c7e9b3d6f8a1c4e7a9d2f5b8c1e4a7d0f

# Set this SAME secret on ALL servers:
# 1. Local .env file
# 2. Hosted server environment variables
# 3. Any other servers (staging, testing, etc.)

# Then restart all services
```

---

## 🧪 Testing After Fix

### Test 1: Login
```bash
curl -X POST https://lunesalove.com/api/moderation-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Should return:
# {
#   "token": "eyJhbGc...",
#   "user": { ... },
#   "accountType": "STANDALONE"
# }
```

### Test 2: Verify Token
```bash
# Copy the token from login response
curl -X POST https://lunesalove.com/api/moderation-auth/verify-token \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbGc..."}'

# Should return:
# {
#   "valid": true,
#   "user": { ... },
#   "accountType": "STANDALONE"
# }
```

### Test 3: Get Unreplied Chats
```bash
# Copy the token from login response
curl -X GET https://lunesalove.com/api/moderation/unreplied-chats \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"

# Should return:
# {
#   "success": true,
#   "chats": [...],
#   "unrepliedChats": [...],
#   "count": 0
# }
```

### Test 4: Auth Status (New Debug Endpoint)
```bash
curl -X GET https://lunesalove.com/api/moderation/debug/auth-status \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"

# Should return:
# {
#   "success": true,
#   "authenticated": true,
#   "userId": "...",
#   "userRole": "MODERATOR",
#   "isModerator": true,
#   "isAdmin": false,
#   "timestamp": "2026-03-07T...",
#   "message": "Token is valid. Authentication working correctly!"
# }
```

---

## 🐛 Debugging the Issue

### If you get "Invalid token":
1. Check JWT_SECRET on hosted server
2. Verify token was generated AFTER you set the JWT_SECRET
3. Clear browser localStorage and login again
4. Check token expiry date

### If you get "No token provided":
1. Verify Authorization header is being sent
2. Check browser DevTools Network tab - see if Authorization header is in the request
3. Check CORS configuration (should allow Authorization header)
4. Current CORS config allows: `Authorization` header ✅

### If you get "Moderator access required":
1. Check user's role in database
2. User must have `role: 'MODERATOR'` or `role: 'ADMIN'`
3. Verify user account created properly when logging in

---

## 📋 Checklist

- [ ] Logged in successfully (token is generated)
- [ ] Token is stored in localStorage
- [ ] Browser DevTools shows Authorization header in Network tab
- [ ] JWT_SECRET is identical on all servers
- [ ] `/api/moderation/debug/auth-status` returns success
- [ ] `/api/moderation/unreplied-chats` returns data
- [ ] `/api/moderation/replied-chats` returns data

---

## 🆘 Still Having Issues?

Check the backend logs:
```bash
# SSH into hosted server
tail -f logs/backend.log

# Look for:
# [AUTH] No token provided in request
# [AUTH] Token verification failed
# [AUTH] Headers: { authHeader: ... }
```

**Or run the login test and check what's being sent:**
```bash
# Open browser DevTools Network tab
# Try to login
# Find the login request and check:
# 1. Response has "token" field
# 2. Check subsequent requests (unreplied-chats) for Authorization header
```

---

**Last Updated:** March 7, 2026  
**Status:** 🟢 Ready to diagnose
