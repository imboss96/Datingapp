# ngrok Tunnel Manager for Tinder2 Project
# This script helps manage ngrok tunnels for exposing the app to the internet

param(
    [ValidateSet("start", "stop", "status", "dashboard")]
    [string]$Action = "start"
)

$env:Path += ";$env:ProgramFiles\ngrok"

function Test-NgrokInstalled {
    try {
        $output = ngrok version 2>&1
        return $true
    } catch {
        Write-Host "❌ ngrok is not installed!" -ForegroundColor Red
        return $false
    }
}

function Start-NgrokTunnels {
    Write-Host "🚀 Starting ngrok tunnel for reverse proxy..." -ForegroundColor Green
    Write-Host "Backend:  http://localhost:5000 → Reverse Proxy" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3001 → Reverse Proxy" -ForegroundColor Cyan
    Write-Host "Proxy:    http://localhost:8000 → ngrok" -ForegroundColor Cyan
    Write-Host "`nTunnel is starting, check http://localhost:4040 for details..." -ForegroundColor Yellow
    
    # Start single proxy tunnel from config
    ngrok start proxy --log=stdout
}

function Stop-NgrokTunnels {
    Write-Host "🛑 Stopping ngrok tunnels..." -ForegroundColor Yellow
    $processes = Get-Process | Where-Object {$_.ProcessName -eq "ngrok"}
    if ($processes) {
        $processes | ForEach-Object { Stop-Process -Id $_.Id -Force }
        Write-Host "✅ ngrok tunnels stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No ngrok processes found" -ForegroundColor Gray
    }
}

function Get-TunnelStatus {
    Write-Host "📊 Tunnel Status" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    
    try {
        # Check if ngrok is running
        $processes = Get-Process | Where-Object {$_.ProcessName -eq "ngrok"}
        if ($processes) {
            Write-Host "✅ ngrok is running (PID: $($processes.Id -join ', '))" -ForegroundColor Green
            
            # Get tunnel URLs from API
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing | ConvertFrom-Json
                if ($response.tunnels) {
                    Write-Host "`n🌐 Active Tunnels:" -ForegroundColor Cyan
                    $response.tunnels | ForEach-Object {
                        Write-Host "  [$($_.name)] $($_.public_url)" -ForegroundColor Yellow
                    }
                    Write-Host "`n💡 Update your .env.local with these URLs!" -ForegroundColor Cyan
                } else {
                    Write-Host "⚠️  No tunnels active yet. Tunnels starting..." -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️  Cannot reach ngrok dashboard at localhost:4040" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ ngrok is not running" -ForegroundColor Red
            Write-Host "Run './ngrok-manager.ps1 start' to start tunnels" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Error checking status: $_" -ForegroundColor Red
    }
}

function Open-Dashboard {
    Write-Host "🌐 Opening ngrok dashboard..." -ForegroundColor Cyan
    Start-Process "http://localhost:4040"
}

# Main
if (-not (Test-NgrokInstalled)) {
    exit 1
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "   ngrok Tunnel Manager - Tinder2" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor White

switch ($Action) {
    "start" { Start-NgrokTunnels }
    "stop" { Stop-NgrokTunnels }
    "status" { Get-TunnelStatus }
    "dashboard" { Open-Dashboard }
    default { Start-NgrokTunnels }
}
