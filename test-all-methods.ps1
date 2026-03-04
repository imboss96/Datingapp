# Quick Test Script - All Payment Methods
# Usage: .\test-all-methods.ps1 -UserId "YOUR_USER_ID"

param(
    [Parameter(Mandatory=$true)]
    [string]$UserId,
    
    [string]$BackendUrl = "http://localhost:5000",
    [string]$PackageId = "coins_50"
)

# Color output helper
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Payment methods to test
$methods = @(
    @{ id = "stripe"; name = "Stripe (Credit Card)"; emoji = "💳" },
    @{ id = "paypal"; name = "PayPal"; emoji = "🅿️" },
    @{ id = "apple_pay"; name = "Apple Pay"; emoji = "🍎" },
    @{ id = "google_pay"; name = "Google Pay"; emoji = "G" },
    @{ id = "lipana"; name = "Lipana (M-Pesa)"; emoji = "📱" },
    @{ id = "crypto"; name = "Cryptocurrency"; emoji = "₿" },
    @{ id = "bank_transfer"; name = "Bank Transfer"; emoji = "🏦" }
)

$baseUrl = "$BackendUrl/api/lipana/test-payment-method"

Write-Info "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Info "   PAYMENT METHOD EMAIL TEST SUITE"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

Write-Info "Configuration:"
Write-Info "  Backend URL: $BackendUrl"
Write-Info "  User ID: $UserId"
Write-Info "  Package: $PackageId"
Write-Info "  Testing: $($methods.Count) payment methods`n"

Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

$successCount = 0
$failCount = 0
$results = @()

foreach ($method in $methods) {
    $methodId = $method.id
    $methodName = $method.name
    $emoji = $method.emoji
    
    Write-Host "Testing: $emoji $methodName" -ForegroundColor Yellow
    
    $body = @{
        userId = $UserId
        packageId = $PackageId
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/$methodId" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 10
        
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.ok -and $result.emailSent) {
            Write-Success "$methodName - Transaction: $($result.transactionId)"
            Write-Host "           Email sent to: $($result.user.email)" -ForegroundColor Gray
            Write-Host "           Coins: $($result.user.coins) | Premium: $($result.user.isPremium)" -ForegroundColor Gray
            $successCount++
        } else {
            Write-Fail "$methodName - Response: $($result.message)"
            $failCount++
        }
        
        $results += @{
            method = $methodId
            name = $methodName
            success = $true
            txId = $result.transactionId
            email = $result.user.email
        }
        
    } catch {
        Write-Fail "$methodName - Error: $($_.Exception.Message)"
        $failCount++
        
        $results += @{
            method = $methodId
            name = $methodName
            success = $false
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
Write-Info "SUMMARY"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

Write-Success "Total Successful: $successCount"
Write-Fail "Total Failed: $failCount"

Write-Info "`nResults Table:"
Write-Host "`n{0,-20} {1,-50} {2,-8}" -f "Method", "Status", "Email Sent"
Write-Host "─────────────────────────────────────────────────────────────────"

foreach ($res in $results) {
    $status = if ($res.success) { "✓ SUCCESS" } else { "✗ FAILED" }
    Write-Host "{0,-20} {1,-50} {2,-8}" -f $res.name, $status, ($res.success ? "Yes" : "No")
    
    if ($res.success) {
        Write-Host "  ↳ TxID: $($res.txId)" -ForegroundColor Gray
        Write-Host "  ↳ Email: $($res.email)" -ForegroundColor Gray
    } else {
        Write-Host "  ↳ Error: $($res.error)" -ForegroundColor Red
    }
}

Write-Info "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"

# Verify in Database
Write-Info "Next Steps:`n"
Write-Info "1. Check backend logs for email confirmations:"
Write-Info "   Look for: [LIPANA /test-payment-method/*] email sent to:`n"

Write-Info "2. Verify transactions in MongoDB:"
Write-Host "   mongosh mongodb://localhost:27017/datingapp"
Write-Host "   > db.transactions.find({userId: ObjectId('$UserId')}, {method: 1, status: 1}).pretty()`n"

Write-Info "3. Verify user coins updated:"
Write-Host "   > db.users.findOne({_id: ObjectId('$UserId')}, {coins: 1, email: 1})`n"

Write-Info "4. Check emails in Brevo:"
Write-Host "   💻 Open: https://app.brevo.com → Transactional → Emails → Sent"
Write-Host "   🔍 Filter by: $UserId or user email`n"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Exit with appropriate code
if ($failCount -eq 0) {
    Write-Success "`nAll $successCount payment methods tested successfully!`n"
    exit 0
} else {
    Write-Fail "`nSome tests failed. Check logs above.`n"
    exit 1
}
