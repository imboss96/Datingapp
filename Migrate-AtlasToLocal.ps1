# Export data from MongoDB Atlas to Local MongoDB
# Prerequisites: mongodump and mongorestore must be in PATH

Write-Host "MongoDB Atlas to Local Migration Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if mongodump is available
try {
    mongodump --version | Out-Null
    Write-Host "✓ mongodump is available" -ForegroundColor Green
} catch {
    Write-Host "✗ mongodump not found in PATH" -ForegroundColor Red
    Write-Host "Install MongoDB Tools: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
    exit 1
}

# MongoDB Atlas connection string
$atlasUri = "mongodb+srv://joshuanyandieka3_db_user:MyVision%402040@lunesaprod.5pt7jzr.mongodb.net/"
$dbName = "datingapp"
$dumpDir = "$PSScriptRoot\mongodb-dump"

Write-Host "`n1. Creating dump directory..." -ForegroundColor Yellow
if (-not (Test-Path $dumpDir)) {
    New-Item -ItemType Directory -Path $dumpDir | Out-Null
}
Write-Host "✓ Dump directory: $dumpDir" -ForegroundColor Green

Write-Host "`n2. Exporting data from MongoDB Atlas..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes depending on data size)" -ForegroundColor Cyan

try {
    & mongodump --uri "$atlasUri" `
        --db $dbName `
        --out $dumpDir `
        --gzip
    
    Write-Host "✓ Export completed!" -ForegroundColor Green
    Write-Host "Data saved to: $dumpDir\$dbName" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Export failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Verifying Local MongoDB is running..." -ForegroundColor Yellow
try {
    mongosh --eval "db.adminCommand('ping')" --quiet | Out-Null
    Write-Host "✓ Local MongoDB is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Local MongoDB is not running!" -ForegroundColor Red
    Write-Host "Start it with: Start-Service MongoDB" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n4. Importing data to Local MongoDB..." -ForegroundColor Yellow
try {
    & mongorestore `
        --uri "mongodb://localhost:27017" `
        --db $dbName `
        "$dumpDir\$dbName" `
        --gzip
    
    Write-Host "✓ Import completed!" -ForegroundColor Green
} catch {
    Write-Host "✗ Import failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n5. Verifying imported data..." -ForegroundColor Yellow
try {
    $userCount = mongosh --eval "use $dbName; db.users.countDocuments()" --quiet
    Write-Host "✓ Total users in local database: $userCount" -ForegroundColor Green
} catch {
    Write-Host "✗ Could not verify data" -ForegroundColor Yellow
}

Write-Host "`n✓ Migration Complete!" -ForegroundColor Green
Write-Host "Your backend is now configured to use local MongoDB." -ForegroundColor Cyan
Write-Host "Start your app with: npm run dev" -ForegroundColor Gray
