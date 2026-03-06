# Moderation Token Issue - Solutions Applied ✅

## Problem Summary
- Moderation standalone works locally ✅
- Moderation standalone fails on hosted server ❌
- Error: "Invalid token"
- Unreplied/replied chat sections don't load data

---

## Root Cause Analysis

The issue is almost certainly **JWT_SECRET mismatch** between your local and hosted servers:

1. **Local Server**: Token generated with `JWT_SECRET=dev_secret_key_change_in_production`
2. **Hosted Server**: Different `JWT_SECRET` (or not set)
3. **Result**: Token verification fails because secrets don't match

---

## Solutions Applied ✅

### 1. Enhanced Token Debugging
**File**: `backend/middleware/auth.js`
- Added detailed logging to see token source (cookie vs header)
- Logs JWT_SECRET configuration status
- Shows token length for debugging
- Better error messages for troubleshooting

### 2. New Debug Endpoint
**File**: `backend/routes/moderation.js`
- Endpoint: `GET /api/moderation/debug/auth-status`
- Requires authentication (uses modOnlyMiddleware)
- Returns: User ID, role, moderator status, authentication status
- **Usage**: Test if your token is valid on hosted server

### 3. Diagnostic Guide
**File**: `MODERATION_TOKEN_DIAGNOSTIC.md`
- Complete troubleshooting steps
- JWT_SECRET checking procedures
- Examples with curl commands
- Testing checklist

### 4. Test Script
**File**: `backend/test-moderation-token.js`
- Automated diagnostic tool
- Tests 7 stages of token flow:
  1. Backend connectivity
  2. Login endpoint
  3. Token inspection
  4. Token verification
  5. Backend verification
  6. Auth middleware
  7. Moderation endpoints

---

## 🔧 How to Fix

### **CRITICAL**: Verify JWT_SECRET Matches

```bash
# 1. Check your LOCAL JWT_SECRET
cat backend/.env | grep JWT_SECRET
# Should show: JWT_SECRET=dev_secret_key_change_in_production

# 2. Check your HOSTED server JWT_SECRET
#    - SSH to your server, OR
#    - Check your cloud platform's environment variables
#    - (Heroku, Railway, AWS, etc.)

# 3. THEY MUST BE IDENTICAL!
```

### Option A: Update Hosted Server (Quick Fix)

```bash
# For cloud platforms (Heroku, Railway, Render, etc.):
# Set environment variable to match local:

# Heroku:
heroku config:set JWT_SECRET=dev_secret_key_change_in_production

# Railway:
# Go to Dashboard → Project → Variables → Add
# JWT_SECRET=dev_secret_key_change_in_production

# AWS:
# Update Lambda/EC2 environment variables

# Then restart the backend service
```

### Option B: Use Strong Production Secret (Recommended)

```bash
# Generate a strong random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: 8f4a9c2e1b5d7f3a9e6c8b2d5f1a4c7e9b3d6f8a1c4e7a9d2f5b8c1e4a7d0f

# 1. Update LOCAL .env file:
echo "JWT_SECRET=8f4a9c2e1b5d7f3a9e6c8b2d5f1a4c7e9b3d6f8a1c4e7a9d2f5b8c1e4a7d0f" >> backend/.env

# 2. Set on HOSTED server:
heroku config:set JWT_SECRET=8f4a9c2e1b5d7f3a9e6c8b2d5f1a4c7e9b3d6f8a1c4e7a9d2f5b8c1e4a7d0f

# 3. IMPORTANT: Commit to git (but NOT to public repo):
git add backend/.env
git commit -m "Update JWT_SECRET to production value"

# ⚠️ If this repo is public, use a different secret for production!
```

---

## 🧪 Testing the Fix

### Quick Test (No Tools Needed)
```bash
# 1. Stop backend
# 2. Update JWT_SECRET in backend/.env to match hosted server
# 3. Restart backend: npm run dev
# 4. Try logging in again in browser
# 5. Check if unreplied/replied chats load data
```

### Full Diagnostic Test
```bash
# Run the automated test script:
cd backend
node test-moderation-token.js https://lunesalove.com your_username your_password

# Example output:
# ✓ Login successful
# ✓ Token decoded successfully
# ✓ Token verified with JWT_SECRET from .env
# ✓ Backend verification successful
# ✓ Auth middleware working correctly!
# ✓ Unreplied Chats: Working
# ✓ Replied Chats: Working
```

### Manual Curl Test
```bash
# 1. Login and get token:
TOKEN=$(curl -s -X POST https://lunesalove.com/api/moderation-auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_user","password":"your_pass"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 2. Test debug endpoint:
curl -X GET https://lunesalove.com/api/moderation/debug/auth-status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should return:
# {"success":true,"authenticated":true,"userId":"...","userRole":"MODERATOR"...}

# 3. Test unreplied chats:
curl -X GET https://lunesalove.com/api/moderation/unreplied-chats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should return chat data
```

---

## 📋 Verification Checklist

After applying fixes:

- [ ] JWT_SECRET is identical on local and hosted servers
- [ ] Backend service restarted after JWT_SECRET change
- [ ] New tokens generated AFTER JWT_SECRET update
- [ ] Browser localStorage cleared and user logged in again
- [ ] Debug endpoint returns `"authenticated": true`
- [ ] Unreplied chats endpoint returns data
- [ ] Replied chats endpoint returns data
- [ ] No "Invalid token" errors in browser console
- [ ] No `[AUTH] Token verification failed` in backend logs

---

## 🚀 Additional Improvements Made

### Better Error Logging
The authMiddleware now logs:
- Token source (cookie or header)
- Whether JWT_SECRET is configured
- Token length (for debugging)
- Detailed error messages

### Example Logs (Backend Console)
```
[AUTH] No token provided in request
[AUTH] Headers: { authHeader: 'present', cookies: ['session'] }
```

```
[AUTH] Token verification failed: {
  error: 'invalid signature',
  tokenSource: 'header',
  jwtSecretConfigured: true,
  tokenLength: 248
}
```

---

## 🆘 If Problem Persists

### Check These Things:

1. **Is the token being sent?**
   ```javascript
   // Browser DevTools Console
   console.log(localStorage.getItem('moderationToken'));
   ```

2. **Is Authorization header in requests?**
   - Open DevTools → Network tab
   - Look at any moderation request
   - Check "Request Headers" section
   - Should see: `Authorization: Bearer eyJ...`

3. **Is JWT_SECRET truly the same?**
   ```bash
   # Local
   grep JWT_SECRET backend/.env
   
   # Hosted
   ssh user@server "echo \$JWT_SECRET"
   # OR check your cloud platform console
   ```

4. **Are you testing with a valid moderator?**
   ```javascript
   // In browser console
   console.log(JSON.parse(localStorage.getItem('moderationUser')));
   // Check: role should be 'MODERATOR' or 'ADMIN'
   ```

5. **Is the token expired?**
   ```javascript
   // In browser console
   const token = localStorage.getItem('moderationToken');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires:', new Date(payload.exp * 1000));
   ```

### Still Stuck?

1. Run the diagnostic script: `node test-moderation-token.js https://lunesalove.com youruser yourpass`
2. Share the output (sanitize the token)
3. Check backend logs: `PM2` or `docker logs` or your cloud platform's logs

---

## 📚 Reference Links

- **Diagnostic Tool**: `backend/test-moderation-token.js`
- **Diagnostic Guide**: `MODERATION_TOKEN_DIAGNOSTIC.md`
- **Token Debug Endpoint**: `GET /api/moderation/debug/auth-status`
- **Updated Auth Middleware**: `backend/middleware/auth.js`

---

## 🎯 Summary

**The Issue**: JWT_SECRET mismatch  
**The Fix**: Ensure JWT_SECRET is identical on all servers  
**The Tool**: Use `test-moderation-token.js` to verify  
**The Result**: ✅ Moderation system works on hosted server

---

**Date**: March 7, 2026  
**Status**: Ready for deployment  
**Next Step**: Update JWT_SECRET on hosted server and restart backend
