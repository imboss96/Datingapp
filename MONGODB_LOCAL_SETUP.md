# MongoDB Local Setup Guide for Windows

## Option 1: Using MongoDB Community Edition (Recommended)

### Step 1: Download MongoDB
1. Visit: https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (currently 8.x)
   - Platform: Windows x64
   - Package: msi
3. Click "Download"

### Step 2: Install MongoDB
1. Run the downloaded `.msi` installer
2. Choose "Complete" installation
3. Check "Install MongoDB as a Service"
4. Check "Run the MongoDB service as network service user"
5. Leave default data directory: `C:\Program Files\MongoDB\Server\8.0\data`
6. Click Install

### Step 3: Verify Installation
```powershell
mongod --version
mongosh --version
```

### Step 4: Start MongoDB Service
MongoDB should auto-start. To verify:
```powershell
Get-Service MongoDB
# or start manually:
Start-Service MongoDB
```

---

## Option 2: Using Docker (Alternative)

### Prerequisites:
- Docker Desktop installed

### Commands:
```bash
docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:latest
```

---

## Configuration for Your App

After installation, update your `.env` files:

**development (.env):**
```
MONGODB_URI=mongodb://localhost:27017/datingapp
```

**production (.env on server):**
```
MONGODB_URI=mongodb://localhost:27017/datingapp
```

---

## Exporting Data from MongoDB Atlas (Optional)

If you want to transfer existing data:

```bash
# Export from Atlas
mongodump --uri "mongodb+srv://username:password@cluster.mongodb.net/datingapp" --out ./dump

# Import to Local MongoDB
mongorestore --db datingapp ./dump/datingapp
```

---

## Verify Connection

```powershell
# Connect to local MongoDB
mongosh

# In the mongosh shell:
use datingapp
db.users.countDocuments()
```

---

## Common Issues

### Service won't start
- Check if port 27017 is already in use: `netstat -ano | findstr :27017`
- Try different port in connection string

### Permission denied
- Run PowerShell as Administrator
- Check C:\Program Files\MongoDB\Server\8.0 has read/write permissions

### Data directory issues
- Create `C:\Program Files\MongoDB\Server\8.0\data` folder manually
- Create `C:\Program Files\MongoDB\Server\8.0\log` folder manually

---

## Test Connection with Your App

After setup, restart your backend and check logs for successful connection.
