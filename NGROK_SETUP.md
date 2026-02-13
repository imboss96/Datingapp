# ngrok Setup Guide - Tinder2 Project with Reverse Proxy

## ✅ Current Status

Your project is now exposed to the internet via ngrok with a **single public URL** using a reverse proxy!

### 🌐 Public URLs
- **Everything:** https://liminal-transdiaphragmatic-amal.ngrok-free.dev
  - Frontend: https://liminal-transdiaphragmatic-amal.ngrok-free.dev/
  - API: https://liminal-transdiaphragmatic-amal.ngrok-free.dev/api/
- **Local Reverse Proxy:** http://localhost:8000
- **ngrok Dashboard:** http://localhost:4040

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Internet Users                         │
│    https://liminal-transdiaphragmatic-amal.ngrok...    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │     ngrok Tunnel         │
          │      (Public URL)        │
          └────────────┬─────────────┘
                       │
                       ▼
    ┌──────────────────────────────────────┐
    │     Reverse Proxy (Port 8000)        │
    │  - Routes /api/* → Backend           │
    │  - Routes /* → Frontend              │
    └──┬──────────────────────────┬────────┘
       │                          │
       ▼                          ▼
  ┌─────────────┐           ┌─────────────┐
  │  Backend    │           │  Frontend   │
  │  :5000      │           │  :3001      │
  │  (Node.js)  │           │  (Vite)     │
  └─────────────┘           └─────────────┘
```

## 🔧 What Was Configured

1. **Reverse Proxy Setup**
   - Node.js express reverse proxy on port 8000
   - Routes API requests to backend (port 5000)
   - Routes frontend requests to frontend dev server (port 3001)
   - File: `reverse-proxy.js`

2. **ngrok Configuration** 
   - Single tunnel exposing reverse proxy (port 8000)
   - Authtoken stored in: `C:\Users\Administrator\AppData\Local\ngrok\ngrok.yml`
   - Config uses: `ngrok start proxy`

3. **Frontend Integration**
   - API URL in `.env.local`: `https://liminal-transdiaphragmatic-amal.ngrok-free.dev/api`
   - All API requests go through the same public URL

## 🚀 Starting Services

### Complete Startup (All 3 services)

**Terminal 1: Backend**
```powershell
cd C:\Users\Administrator\Documents\TINDER2\Tinder2\backend
node server.js
```

**Terminal 2: Frontend**
```powershell
cd C:\Users\Administrator\Documents\TINDER2\Tinder2
npm run dev
```

**Terminal 3: Reverse Proxy**
```powershell
cd C:\Users\Administrator\Documents\TINDER2\Tinder2
npm run proxy
```

**Terminal 4: ngrok**
```powershell
.\ngrok-manager.ps1 start
# OR manually:
$env:Path += ";$env:ProgramFiles\ngrok"
ngrok start proxy
```

### Using the PowerShell Manager Script

```powershell
# Start ngrok tunnel
.\ngrok-manager.ps1 start

# Check tunnel status
.\ngrok-manager.ps1 status

# Stop ngrok
.\ngrok-manager.ps1 stop

# Open ngrok dashboard
.\ngrok-manager.ps1 dashboard
```

## 📱 Testing Your Setup

### Test All Routes Through Public URL

```bash
# Frontend
curl https://liminal-transdiaphragmatic-amal.ngrok-free.dev/

# API
curl https://liminal-transdiaphragmatic-amal.ngrok-free.dev/api/auth/check

# WebSocket (if applicable)
wscat -c wss://liminal-transdiaphragmatic-amal.ngrok-free.dev/ws
```

### Local Testing (Before ngrok)

```bash
# Frontend
http://localhost:3001

# API  
http://localhost:5000/api/auth/check

# Through Reverse Proxy
http://localhost:8000/api/auth/check
```

## 🔑 Key Benefits of Reverse Proxy Approach

✅ **Single Public URL** - Much simpler to manage  
✅ **Better for Mobile** - Single endpoint for all requests  
✅ **Automatic Routing** - Smart path-based routing  
✅ **WebSocket Support** - Real-time features still work  
✅ **SPA Routing** - Frontend routing works seamlessly  
✅ **Future-Ready** - Easy to add more services  

## ⚠️ Important Notes

1. **Free ngrok Limitations**
   - URL changes every ~2 hours when you restart
   - Limited to 20 connections/second
   - Single account limited concurrent tunnels

2. **When URL Changes**
   - ngrok URL will be different after restart
   - Update `VITE_API_URL` in `.env.local`
   - Rebuild frontend: `npm run dev` or restart vite
   - Check dashboard: http://localhost:4040

3. **Port Configuration**
   - Backend: 5000
   - Frontend: 3001
   - Reverse Proxy: 8000
   - ngrok Dashboard: 4040
   - If you change these, update `reverse-proxy.js`

4. **Environment Variables**
   - `.env.local` controls API URL for frontend
   - `reverse-proxy.js` can use `BACKEND_URL` and `FRONTEND_URL` env vars
   - ngrok uses `C:\Users\Administrator\AppData\Local\ngrok\ngrok.yml`

## 🔄 Workflow

1. **Start all services** (see "Starting Services" above)
2. **Check ngrok URL**
   ```powershell
   .\ngrok-manager.ps1 status
   ```
3. **Update .env.local** if URL changed
4. **Test public access**
   - Frontend: https://liminal-transdiaphragmatic-amal.ngrok-free.dev
   - API: https://liminal-transdiaphragmatic-amal.ngrok-free.dev/api/auth/check

## 🛠️ Troubleshooting

### Reverse Proxy won't start
- Check if ports 5000 (backend) and 3001 (frontend) are running
- Error "Cannot find module"? Run: `npm install`

### ngrok tunnel shows error
- Check if reverse proxy is running: `netstat -ano | findstr :8000`
- Try: `ngrok start proxy` manually

### Pages showing "gateway error"
- Verify reverse proxy is receiving requests: check logs
- Ensure backend/frontend are actually running
- Check firewall isn't blocking internal IPs

### Frontend showing API errors
- Check `VITE_API_URL` in `.env.local`
- Verify ngrok URL is correct
- Rebuild frontend to apply env changes

## 📞 Support

- ngrok docs: https://ngrok.com/docs
- Local address: http://127.0.0.1:8000 (reverse proxy)
- Public address: https://liminal-transdiaphragmatic-amal.ngrok-free.dev
- Dashboard: http://localhost:4040

---

**Architecture:** Reverse Proxy + Single ngrok Tunnel  
**Last Updated:** 2026-02-13  
**Current URL:** https://liminal-transdiaphragmatic-amal.ngrok-free.dev
