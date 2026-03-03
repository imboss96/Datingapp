# Quick Start: Local MongoDB Setup

## TL;DR - Quick Setup (5 minutes)

### For Windows Development Machine:

```powershell
# 1. Run installation script (as Administrator)
cd "C:\Users\SEAL TEAM\Documents\DATING\Datingapp-1"
PowerShell -ExecutionPolicy Bypass -File .\Install-MongoDB.ps1

# 2. Verify MongoDB is running
mongosh

# 3. Export data from Atlas (optional)
PowerShell -ExecutionPolicy Bypass -File .\Migrate-AtlasToLocal.ps1

# 4. Restart backend to use local database
cd backend
npm run dev
```

---

## Detailed Steps

### Step 1: Install MongoDB

**Option A: Automatic (Recommended)**
```powershell
# Run as Administrator in the dating app folder
PowerShell -ExecutionPolicy Bypass -File .\Install-MongoDB.ps1
```

**Option B: Manual**
1. Download from: https://www.mongodb.com/try/download/community
2. Run installer
3. Choose "Complete" installation
4. Check "Install MongoDB as a Service"

### Step 2: Verify Installation

```powershell
# Check version
mongod --version

# Test connection
mongosh
# Then in mongosh shell:
> db.adminCommand('ping')
{ ok: 1 }
> exit
```

### Step 3: Migrate Data (Optional)

If you want to keep your existing data from MongoDB Atlas:

```powershell
# First, install MongoDB Database Tools
# Download from: https://www.mongodb.com/try/download/database-tools

# Then run migration script
PowerShell -ExecutionPolicy Bypass -File .\Migrate-AtlasToLocal.ps1
```

### Step 4: Update Environment

Your `.env` file is already updated to:
```
MONGODB_URI=mongodb://localhost:27017/datingapp
```

### Step 5: Start Development Server

```powershell
cd backend
npm run dev
```

Watch for this in the logs:
```
✓ Connected to MongoDB
```

---

## For Production Server (72.62.200.3)

If you also want to use local MongoDB on the production server:

```bash
# SSH into production server
ssh root@72.62.200.3

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify
mongosh
```

Then update `/var/www/datingapp/.env`:
```
MONGODB_URI=mongodb://localhost:27017/datingapp
```

And restart the app:
```bash
pm2 restart datingapp --update-env
```

---

## Troubleshooting

### "mongod not found"
- MongoDB not installed, run the Install-MongoDB.ps1 script
- Or manually install from: https://www.mongodb.com/try/download/community

### "Connection refused" on localhost:27017
- MongoDB service not running. Start it:
  ```powershell
  Start-Service MongoDB
  ```

### "Data directory not found"
- Create folders manually:
  ```powershell
  mkdir "C:\Program Files\MongoDB\Server\8.0\data"
  mkdir "C:\Program Files\MongoDB\Server\8.0\log"
  ```

### "Port 27017 already in use"
- Another MongoDB is running. Check:
  ```powershell
  netstat -ano | findstr :27017
  # Kill the process or change port in connection string
  ```

### Import fails with authentication error
- Make sure you have network access to MongoDB Atlas
- Check your Atlas connection string is correct
- Ensure your IP is whitelisted in Atlas (Network Access)

---

## Useful Commands

```powershell
# Start/Stop MongoDB Service
Start-Service MongoDB
Stop-Service MongoDB
Get-Service MongoDB

# Connect to database
mongosh

# In mongosh shell:
use datingapp              # Switch to database
db.users.countDocuments()  # Count users
db.users.findOne()         # Find first user
db.collections()           # List all collections

# Monitor connection
mongosh --eval "db.adminCommand('ping')"
```

---

## Switching Back to MongoDB Atlas

If you want to switch back to cloud MongoDB:

Update `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/datingapp
```

Then restart backend:
```powershell
npm run dev
```

---

## Performance Comparison

| Feature | Local MongoDB | MongoDB Atlas |
|---------|--------------|---------------|
| Setup | ~10 minutes | Instant |
| Speed | Faster (local) | Dependent on network |
| Storage | Limited by disk | Expandable |
| Backups | Manual | Automatic |
| Access | Local only | From anywhere |
| Cost | Free | Paid tiers |

For development, local MongoDB is faster.
For production, MongoDB Atlas is more reliable.

---

## Questions?

Check the MongoDB docs: https://docs.mongodb.com/
