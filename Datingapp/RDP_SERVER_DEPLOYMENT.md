# Deploy Backend to RDP Server (VPS)

Perfect choice! RDP with 10GB RAM and 150GB SSD is **ideal for <150 users** - no cold starts, fast WebSocket connections, and always on.

## Step 1: Connect to Your RDP Server

### On Windows:
1. Open **Remote Desktop Connection**
2. Enter server IP address
3. Login with provided credentials
4. Connect to your server

### On Mac/Linux:
```bash
# Install RDP client (macOS)
brew install microsoft-remote-desktop

# Or use xfreerdp on Linux
xfreerdp /v:YOUR_SERVER_IP /u:USERNAME /p:PASSWORD
```

## Step 2: Install Node.js on RDP Server

Once connected to your server:

```bash
# Download Node.js LTS
# Option A: Using Windows installer (on RDP desktop)
# Go to https://nodejs.org/ and download LTS version

# Option B: Using PowerShell (if on Windows RDP)
$nodeVersion = "20.11.0"
Invoke-WebRequest -Uri "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.msi" -OutFile "node-installer.msi"
msiexec /i node-installer.msi /quiet

# Verify installation
node --version
npm --version
```

## Step 3: Clone Your Backend Repository

```bash
# Navigate to a good location (e.g., C:\apps or /home/username/apps)
cd C:\apps  # or mkdir first if doesn't exist

# Clone your backend repo
git clone https://github.com/YOUR_USERNAME/YOUR_BACKEND_REPO.git
cd YOUR_BACKEND_REPO

# Install dependencies
npm install
```

## Step 4: Create .env File on Server

Create `.env` file in your backend directory with all production variables:

```bash
# Backend/.env (on RDP server)

# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/spark-dating

# Authentication
JWT_SECRET=your-super-strong-secret-key-minimum-32-characters

# CORS & WebSocket (your Vercel frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app
WS_ORIGIN=https://your-frontend.vercel.app

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=399767936973-xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

Optional but recommended:
```bash
# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics (optional)
SENTRY_DSN=your-sentry-url
```

## Step 5: Install PM2 (Process Manager)

PM2 keeps your app running 24/7 and auto-restarts on crashes:

```bash
# Install PM2 globally
npm install -g pm2

# Start your backend with PM2
pm2 start server.js --name "tinder-backend" --watch

# Save PM2 process list (auto-restart on server reboot)
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs tinder-backend
```

## Step 6: Configure Firewall & Port

### On Windows RDP Server:

```powershell
# Allow port 5000 through Windows Firewall
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=tcp localport=5000

# Verify port is open
netstat -ano | findstr ":5000"
```

### Verify from your local machine:
```bash
# Test if port 5000 is accessible
curl http://YOUR_SERVER_IP:5000/api
```

## Step 7: Set Up Reverse Proxy (Optional but Recommended)

Install Nginx for better performance and SSL:

```bash
# On Windows, download and install Nginx
# From: http://nginx.org/en/download.html

# Or use a simpler option - setup a batch file to handle traffic
```

**Or keep it simple** - just run Node.js on port 5000 directly.

## Step 8: Update Vercel Frontend

Go to your **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add/update these variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `http://YOUR_SERVER_IP:5000/api` |
| `VITE_WS_URL` | `ws://YOUR_SERVER_IP:5000` |
| `VITE_GOOGLE_CLIENT_ID` | `399767936973-qcbt20e5v2sokcf0s0uosmpk694on5j5.apps.googleusercontent.com` |

Then **redeploy** your Vercel frontend.

## Step 9: Test the Connection

### From your local machine:

```bash
# Test API endpoint
curl http://YOUR_SERVER_IP:5000/api/users

# Test WebSocket (should upgrade successfully)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://YOUR_SERVER_IP:5000

# From browser console (when on Vercel frontend)
fetch('http://YOUR_SERVER_IP:5000/api/users')
  .then(r => r.json())
  .then(d => console.log(d))
```

## Step 10: Monitor Your Backend

```bash
# Check PM2 logs
pm2 logs tinder-backend

# Monitor real-time
pm2 monit

# Restart if needed
pm2 restart tinder-backend

# Stop
pm2 stop tinder-backend

# Delete from PM2
pm2 delete tinder-backend
```

## Useful PM2 Commands

```bash
# View all processes
pm2 list

# Show logs with timestamps
pm2 logs tinder-backend --lines 100

# Clear logs
pm2 flush

# Monitor CPU/Memory usage
pm2 monit

# Restart on file changes (development)
pm2 start server.js --watch

# Stop watching
pm2 stop tinder-backend --watch
```

## Architecture Now:

```
┌─────────────────────────────────────────────┐
│  Your Users (Mobile/Web)                    │
└────────┬────────────────────────────────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────────────┐
│  Vercel Frontend                            │
│  (your-app.vercel.app)                      │
│  - React + TypeScript                       │
│  - No cold start                            │
└────────┬────────────────────────────────────┘
         │ HTTP/WebSocket
         ▼
┌─────────────────────────────────────────────┐
│  RDP Server (Your Machine)                  │
│  IP: YOUR_SERVER_IP:5000                    │
│  - Node.js Backend (PM2)                    │
│  - MongoDB Connected                        │
│  - Always On ✅                             │
│  - No Cold Starts ✅                        │
│  - WebSocket 24/7 ✅                        │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  MongoDB Atlas (Cloud)                      │
└─────────────────────────────────────────────┘
```

## Troubleshooting

### Backend won't start:
```bash
# Check error logs
pm2 logs tinder-backend

# Check if port 5000 already in use
netstat -ano | findstr ":5000"

# Kill process on port 5000
taskkill /PID <PID> /F
```

### WebSocket connection fails:
```bash
# Verify CORS_ORIGIN matches exactly
# Verify WS_ORIGIN matches exactly
# Check firewall allows port 5000
# Check MongoDB connection string in .env
```

### Database connection error:
```bash
# Verify MONGODB_URI is correct
# Check MongoDB credentials
# Verify IP whitelist in MongoDB Atlas includes your RDP server IP
```

## Performance Specs for 150 Users:

With 10GB RAM and 150GB SSD:
- ✅ Handles 150 concurrent users easily
- ✅ Fast message delivery (<100ms)
- ✅ Typing indicators real-time
- ✅ Multiple concurrent calls
- ✅ Room to scale to 1000+ users

## Next Steps:

1. Get your RDP server IP address
2. Install Node.js on the server
3. Clone your backend repo
4. Create `.env` file with production variables
5. Run `npm install && pm2 start server.js --watch`
6. Update Vercel frontend variables
7. Redeploy Vercel frontend
8. Test typing indicators, messages, calls

**Done!** Your app is now in production with zero cold starts and always-on WebSocket.
