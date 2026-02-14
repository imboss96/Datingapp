# Windows RDP HTTPS Setup with Caddy + Let's Encrypt

## Overview
This guide sets up HTTPS on your Windows RDP server (147.185.238.129) using **Caddy** - the simplest reverse proxy for Windows that automatically manages SSL certificates from Let's Encrypt.

**Benefits:**
- ✅ Automatic SSL certificate renewal
- ✅ Single configuration file (Caddyfile)
- ✅ Reverse proxy to Node.js backend (localhost:5000)
- ✅ FREE with Let's Encrypt
- ✅ Domain: https://www.lunesalove.com

---

## Step 1: Download Caddy for Windows

### Option A: Pre-built Binary (Easy - Recommended)
1. Go to https://caddyserver.com/download
2. Select:
   - **Platform**: Windows
   - **Arch**: amd64 (or arm64 if 64-bit ARM)
3. Download the ZIP file
4. Extract to: `C:\Caddy\` (create this folder)
5. You should have: `C:\Caddy\caddy.exe`

### Option B: Via Chocolatey (If installed)
```powershell
choco install caddy
```

---

## Step 2: Create Caddyfile Configuration

Create `C:\Caddy\Caddyfile` (no extension) with this content:

```caddyfile
www.lunesalove.com {
    reverse_proxy localhost:5000
    
    # Enable compression
    encode gzip
    
    # Security headers
    header {
        -Server
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
    }
    
    # WebSocket configuration
    @websocket {
        header Connection Upgrade
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:5000
}

# Redirect non-www to www
lunesalove.com {
    redir https://www.lunesalove.com{uri} permanent
}
```

**Note:** Replace `www.lunesalove.com` and `lunesalove.com` with your actual domain.

---

## Step 3: Configure Domain DNS

Your domain registrar (e.g., Namecheap, GoDaddy, etc.) must point to your RDP server:

1. **Go to your domain registrar's DNS settings**
2. **Add/Update DNS Records:**
   ```
   Type: A
   Name: www
   Value: 147.185.238.129
   TTL: 3600
   
   Type: A
   Name: @ (for lunesalove.com)
   Value: 147.185.238.129
   TTL: 3600
   ```
3. **Wait 5-15 minutes** for DNS to propagate (check: `nslookup www.lunesalove.com`)

---

## Step 4: Configure Windows Firewall

Open ports for Caddy:

```powershell
# HTTP (required for Let's Encrypt validation)
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=tcp localport=80

# HTTPS
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=tcp localport=443
```

Alternatively, via Windows Defender Firewall UI:
1. Open "Windows Defender Firewall with Advanced Security"
2. Click "Inbound Rules" → "New Rule"
3. Add rule for ports 80 and 443

---

## Step 5: Run Caddy as Windows Service (Persistent)

### Option A: Using NSSM (Recommended for 24/7 operation)

1. Download NSSM from: https://nssm.cc/download
2. Extract to: `C:\nssm\nssm.exe`
3. Open PowerShell as Administrator:

```powershell
# Install Caddy as Windows service
cd C:\nssm
.\nssm.exe install CaddyService C:\Caddy\caddy.exe
.\nssm.exe set CaddyService AppDirectory C:\Caddy
.\nssm.exe set CaddyService AppParameters run
.\nssm.exe set CaddyService AppExit Default Restart

# Start the service
Start-Service CaddyService

# Verify it's running
Get-Service CaddyService | Select-Object Status
```

### Option B: Using Caddy Task Scheduler

1. Open Task Scheduler (taskschd.msc)
2. Create Basic Task:
   - **Name:** Caddy HTTPS Server
   - **Trigger:** At log on
   - **Action:** Start a program: `C:\Caddy\caddy.exe`
   - **Arguments:** `run --config C:\Caddy\Caddyfile`
   - **Check:** "Run with highest privileges"

### Option C: Manual (for testing)

```powershell
cd C:\Caddy
.\caddy.exe run --config Caddyfile
```

---

## Step 6: Verify HTTPS is Working

```powershell
# Test HTTPS endpoint
Invoke-WebRequest "https://www.lunesalove.com/api/health" -SkipCertificateCheck

# Expected response:
# StatusCode        : 200
# Content           : {"status":"Backend running","timestamp":"..."}
```

Check certificate:
```powershell
# View certificate details
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$cert = [System.Net.ServicePointManager]::FindServicePoint("https://www.lunesalove.com").Certificate
$cert | fl *
```

---

## Step 7: Update Frontend Environment Variables

Once HTTPS is working, update your Vercel frontend:

1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

2. Update variables:
   ```
   VITE_API_URL = https://www.lunesalove.com/api
   VITE_WS_URL = wss://www.lunesalove.com
   ```

3. **Redeploy** frontend on Vercel

---

## Step 8: Update Backend .env (No changes needed)

Your backend `.env` already has correct CORS settings:
```env
CORS_ORIGIN=https://dating-git-main-joshuanyandieka3-gmailcoms-projects.vercel.app
WS_ORIGIN=https://dating-git-main-joshuanyandieka3-gmailcoms-projects.vercel.app
```

These allow your Vercel frontend to connect to the backend through Caddy's HTTPS proxy.

---

## Step 9: Test Full Flow

After deployment:

1. **Visit:** https://www.lunesalove.com
2. **Try Login:** Google OAuth (should work now)
3. **Send Message:** Check WebSocket (should be WSS)
4. **Verify in Browser Console:**
   ```
   ✅ No Mixed Content errors
   ✅ WebSocket: wss://www.lunesalove.com
   ✅ API calls: https://www.lunesalove.com/api
   ```

---

## Troubleshooting

### Certificate Won't Validate
- Ensure DNS is propagated: `nslookup www.lunesalove.com`
- Check firewall: Ports 80 & 443 open
- Check Caddyfile syntax: `caddy validate --config Caddyfile`

### Still Getting Mixed Content Error
- Clear browser cache (Ctrl+Shift+Delete)
- Check Vercel env vars are updated
- Redeploy Vercel frontend

### Caddy Service Won't Start
```powershell
# Check service status and logs
Get-Service CaddyService
# Or for NSSM:
C:\nssm\nssm.exe query CaddyService
# View logs:
C:\nssm\nssm.exe query CaddyService AppStdout
```

### Port 80/443 Already in Use
```powershell
# Find process using port 80
Get-NetTCPConnection -LocalPort 80 | Select-Object OwningProcess
# Kill process (replace PID):
Stop-Process -Id <PID> -Force
```

---

## Certificate Auto-Renewal

Caddy automatically:
- ✅ Obtains certificates from Let's Encrypt
- ✅ Renews 30 days before expiration
- ✅ Requires NO manual intervention
- ✅ Stores certificates in: `C:\Users\<Username>\AppData\Local\Caddy\`

View certificate validity:
```powershell
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$cert.Import("C:\Users\<Username>\AppData\Local\Caddy\certificates\acme-v02.api.letsencrypt.org-directory\www.lunesalove.com\www.lunesalove.com.crt")
$cert | fl NotBefore, NotAfter
```

---

## Next Steps

1. ✅ Download Caddy → Create Caddyfile
2. ✅ Configure DNS (A records to 147.185.238.129)
3. ✅ Open firewall ports 80 & 443
4. ✅ Install Caddy as Windows service
5. ✅ Verify HTTPS working
6. ✅ Update Vercel frontend env vars
7. ✅ Redeploy frontend
8. ✅ Test login & messaging

---

## Useful Commands

```powershell
# Validate Caddyfile syntax
C:\Caddy\caddy.exe validate --config C:\Caddy\Caddyfile

# Reload Caddy (reload config without restart)
C:\Caddy\caddy.exe reload --config C:\Caddy\Caddyfile

# Check if service is running
Get-Service CaddyService | Select-Object Status

# View Caddy logs (if using NSSM)
C:\nssm\nssm.exe query CaddyService AppStdout

# Stop service
Stop-Service CaddyService

# Restart service
Restart-Service CaddyService
```

---

## Support References

- **Caddy Docs:** https://caddyserver.com/docs
- **Let's Encrypt:** https://letsencrypt.org
- **DNS Propagation Check:** https://www.whatsmydns.net
- **SSL Certificate Test:** https://www.ssllabs.com/ssltest
