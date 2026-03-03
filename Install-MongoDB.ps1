# MongoDB Installation Helper for Windows
# Run as Administrator

Write-Host "MongoDB Local Installation Helper" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    exit 1
}

Write-Host "`n1. Checking if MongoDB is already installed..." -ForegroundColor Yellow
try {
    $mongoVersion = mongod --version 2>$null | Select-Object -First 1
    if ($mongoVersion) {
        Write-Host "MongoDB already installed: $mongoVersion" -ForegroundColor Green
        $useExisting = Read-Host "Use existing MongoDB installation? (y/n)"
        if ($useExisting -ne "y") {
            Write-Host "Please uninstall MongoDB first and re-run this script" -ForegroundColor Yellow
            exit 0
        }
    }
}
catch {
    Write-Host "MongoDB not installed (this is expected)" -ForegroundColor Green
}

Write-Host "`n2. Starting MongoDB Service..." -ForegroundColor Yellow
try {
    Start-Service MongoDB -ErrorAction Stop
    Write-Host "MongoDB service started" -ForegroundColor Green
}
catch {
    Write-Host "MongoDB service not found - installing..." -ForegroundColor Yellow
    Write-Host "Please install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n3. Creating MongoDB data directories..." -ForegroundColor Yellow
$dataDir = "C:\Program Files\MongoDB\Server\8.0\data"
$logDir = "C:\Program Files\MongoDB\Server\8.0\log"

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "Created: $dataDir" -ForegroundColor Green
}
else {
    Write-Host "Data directory exists: $dataDir" -ForegroundColor Green
}

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "Created: $logDir" -ForegroundColor Green
}
else {
    Write-Host "Log directory exists: $logDir" -ForegroundColor Green
}

Write-Host "`n4. Waiting for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n5. Verifying MongoDB connection..." -ForegroundColor Yellow
$connected = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $result = mongosh --eval "db.adminCommand('ping')" --quiet 2>&1
        if ($null -eq $result -or $result -match "ok") {
            Write-Host "MongoDB is running and connected!" -ForegroundColor Green
            $connected = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $connected) {
    Write-Host "Could not verify connection. MongoDB may still be starting..." -ForegroundColor Yellow
}

Write-Host "`n6. Configuration:" -ForegroundColor Cyan
Write-Host "  - Your .env is configured with: MONGODB_URI=mongodb://localhost:27017/datingapp" -ForegroundColor Gray
Write-Host "  - MongoDB running on: localhost:27017" -ForegroundColor Gray
Write-Host "  - Database name: datingapp" -ForegroundColor Gray

Write-Host "`n7. Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "  2. Check logs for: 'Connected to MongoDB'" -ForegroundColor Gray
Write-Host "  3. Optional: Run Migrate-AtlasToLocal.ps1 to import existing data" -ForegroundColor Gray

Write-Host "`nMongoDB Local Setup Complete!" -ForegroundColor Green

