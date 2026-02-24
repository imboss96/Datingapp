# WebSocket URL Setup for Vercel Deployment

## Overview

The WebSocket URL needs to be updated when deploying to Vercel. This guide shows you how to configure it for different environments.

## Environment Variables

### Step 1: Create `.env.local` (Frontend)

In your Vercel project root or local `.env.local`:

```env
# For localhost development (auto-detects)
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=

# For ngrok testing
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev/api
VITE_WS_URL=wss://your-ngrok-url.ngrok-free.dev

# For production Vercel
VITE_API_URL=https://your-backend-domain.vercel.app/api
VITE_WS_URL=wss://your-backend-domain.vercel.app
```

### Step 2: Set Variables in Vercel Dashboard

1. Go to **Vercel Dashboard** → Your Frontend Project
2. Click **Settings** → **Environment Variables**
3. Add the following:

| Variable | Value | Example |
|----------|-------|---------|
| `VITE_API_URL` | Backend API URL | `https://my-backend.vercel.app/api` |
| `VITE_WS_URL` | Backend WebSocket URL | `wss://my-backend.vercel.app` |

## How WebSocket URL Resolution Works

The code automatically detects and uses the WebSocket URL in this priority:

### **Priority 1: Environment Variable (Production)**
```typescript
const wsEnv = import.meta.env.VITE_WS_URL;
if (wsEnv) {
  wsUrl = wsEnv;  // Use environment variable
}
```

### **Priority 2: Auto-Detect (Development)**
```typescript
else {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  wsUrl = `${protocol}//${host}/ws`;  // Auto-detect from current location
}
```

## Different Environments

### **1. Local Development (localhost)**

```env
# .env.local
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=          # Leave empty - auto-detects localhost
```

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:5000`
- WebSocket: `ws://localhost:5000` (auto-detected)

### **2. ngrok Testing**

```env
# .env.local
VITE_API_URL=https://abc123def456.ngrok-free.dev/api
VITE_WS_URL=wss://abc123def456.ngrok-free.dev
```

- Frontend: `https://abc123def456.ngrok-free.dev`
- Backend: `https://abc123def456.ngrok-free.dev`
- WebSocket: `wss://abc123def456.ngrok-free.dev/ws`

### **3. Vercel Production (Recommended)**

**Frontend on Vercel:**
```
https://my-frontend.vercel.app
```

**Backend on Vercel:**
```
https://my-backend.vercel.app
```

**Vercel Environment Variables:**
```
VITE_API_URL=https://my-backend.vercel.app/api
VITE_WS_URL=wss://my-backend.vercel.app
```

## Backend Configuration

Ensure your backend supports WebSocket connections from your frontend domain.

### Update `.env` (Backend)

```env
# backend/.env
CORS_ORIGIN=https://my-frontend.vercel.app
WS_ORIGIN=https://my-frontend.vercel.app
```

### Update CORS in `backend/server.js`

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
```

## Testing WebSocket Connection

Open browser DevTools (F12) and check the console for:

```
[WebSocket] Connecting to: wss://my-backend.vercel.app/ws
[WebSocket] Connected
[WebSocket] Registration confirmed
```

## Common Issues & Solutions

### WebSocket Connection Fails

**Problem:** `WebSocket is closed before the connection is established`

**Solutions:**
1. ✅ Verify backend is running
2. ✅ Check CORS_ORIGIN in backend matches frontend domain
3. ✅ Ensure WebSocket URL is correct (use `wss://` for HTTPS)
4. ✅ Check that `/ws` endpoint exists in backend

### Wrong Protocol (ws vs wss)

**Problem:** Mixed secure/insecure content

- Frontend on HTTPS → Must use `wss://` (secure)
- Frontend on HTTP → Can use `ws://` (insecure)

**The code auto-detects this:**
```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
```

### Environment Variable Not Loading

**Problem:** VITE_WS_URL not recognized

**Solutions:**
1. ✅ Restart development server after changing `.env.local`
2. ✅ Use `import.meta.env.VITE_WS_URL` (not `process.env.VITE_WS_URL`)
3. ✅ Check .env.local exists in project root
4. ✅ Verify variable name starts with `VITE_` prefix

## Quick Deployment Checklist

- [ ] Backend deployed to Vercel/Railway/Heroku
- [ ] Backend URL copied (e.g., `https://my-backend.vercel.app`)
- [ ] Added `VITE_API_URL` to Vercel environment variables
- [ ] Added `VITE_WS_URL` to Vercel environment variables
- [ ] Backend CORS_ORIGIN updated to frontend domain
- [ ] Redeployed backend with new environment variables
- [ ] Redeployed frontend with new environment variables
- [ ] Tested typing indicators (real-time feature)
- [ ] Checked browser console for WebSocket logs

## File Modified

[services/useWebSocket.ts](services/useWebSocket.ts#L14-L27) - Updated to support `VITE_WS_URL` environment variable
