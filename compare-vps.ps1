# Comparison script between local and VPS code
# Usage: .\compare-vps.ps1

$LocalPath = "C:\Users\SEAL TEAM\Documents\DATING\Datingapp-1"
$VpsHost = "root@103.241.67.116"
$VpsPath = "/var/www/Datingapp"
$OutputFile = "$LocalPath\vps-comparison-report.txt"

# Create report header
$report = @"
═══════════════════════════════════════════════════════════════
VPS SYNC COMPARISON REPORT
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
═══════════════════════════════════════════════════════════════

LOCAL PATH: $LocalPath
VPS PATH:   $VpsPath (via $VpsHost)

"@

Write-Host "Comparing local vs VPS code..." -ForegroundColor Cyan

# Key directories to compare
$dirsToCheck = @(
    "backend",
    "components", 
    "src",
    "services",
    "hooks",
    "public"
)

foreach ($dir in $dirsToCheck) {
    $localDir = Join-Path $LocalPath $dir
    if (Test-Path $localDir) {
        $localFiles = @(Get-ChildItem -Path $localDir -File -Recurse | 
                       Where-Object { $_.Extension -match '\.(js|tsx|ts|json)$' })
        
        $report += @"
┌─ Directory: $dir
│  Local Files: $($localFiles.Count)
│  Local Total Size: $([math]::Round(($localFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB
│
"@
    }
}

# Get VPS file count via SSH
Write-Host "Fetching VPS file information..." -ForegroundColor Yellow
$vpsInfo = ssh $VpsHost "cd $VpsPath && find . -type f \( -name '*.js' -o -name '*.tsx' -o -name '*.ts' -o -name '*.json' \) ! -path './node_modules/*' ! -path './.git/*' ! -path './dist/*' | wc -l"
$vpsSize = ssh $VpsHost "cd $VpsPath && du -sh --exclude=node_modules --exclude=.git --exclude=dist ."

$report += @"

┌─ VPS Statistics:
│  Total Code Files (excluding node_modules/.git/dist): $vpsInfo
│  Total VPS Size: $vpsSize
│
"@

# Compare key files
Write-Host "Comparing key backend files..." -ForegroundColor Yellow
$report += @"

═══ KEY FILE COMPARISON ═══

"@

$keyFiles = @(
    "backend\server.js",
    "backend\tunnel.js",
    "backend\package.json",
    "App.tsx",
    "types.ts",
    "package.json"
)

foreach ($file in $keyFiles) {
    $localFile = Join-Path $LocalPath $file
    if (Test-Path $localFile) {
        $localHash = (Get-FileHash $localFile -Algorithm SHA256).Hash
        $localSize = (Get-Item $localFile).Length
        $localModified = (Get-Item $localFile).LastWriteTime
        
        # Get remote file via SCP
        $vpsModified = ssh $VpsHost "stat -c '%y' $VpsPath/$file" 2>$null
        $vpsHash = ssh $VpsHost "sha256sum $VpsPath/$file" 2>$null
        
        if ($vpsHash) {
            $vpsHashValue = $vpsHash.Split()[0]
            $match = if ($localHash -eq $vpsHashValue) { "[MATCH]" } else { "[DIFFERENT]" }
            
            $report += @"
File: $file
  Local:   SHA256=$($localHash.Substring(0,16))... | Modified: $localModified | Size: $localSize bytes
  VPS:     SHA256=$($vpsHashValue.Substring(0,16))... | Modified: $vpsModified | Status: $match
  
"@
        } else {
            $report += @"
File: $file
  Local:   SHA256=$($localHash.Substring(0,16))... | Size: $localSize bytes
  VPS:     [File not found or error accessing]
  
"@
        }
    }
}

# Save report
$report | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host ""
Write-Host "Report saved to: $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Comparison Summary:" -ForegroundColor Cyan
Write-Host $report
