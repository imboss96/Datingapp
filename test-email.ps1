
# Test coin purchase with email delivery

$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    userId = "6788eab1b94a5c1234567890"
    packageId = "coins_50"
    method = "stripe"
} | ConvertTo-Json

Write-Host "Testing: POST http://localhost:5000/api/lipana/test-payment-method/stripe"
Write-Host "Body:"
Write-Host $body
Write-Host ""
Write-Host "Sending request..."
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/lipana/test-payment-method/stripe" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✓ Success! Status Code: $($response.StatusCode)"
    Write-Host ""
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "Response Body:"
        $_.Exception.Response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}

Write-Host ""
Write-Host "Check terminal output for detailed logs from brevoService"
