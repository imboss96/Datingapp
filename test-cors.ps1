# Test CORS configuration
Write-Host "Testing CORS from https://lunesalove.com..." -ForegroundColor Cyan

$response = Invoke-WebRequest -Method Options `
  -Uri "https://lunesalove.com/api/auth/login" `
  -Headers @{
    "Origin" = "https://lunesalove.com"
    "Access-Control-Request-Method" = "POST"
  } `
  -SkipCertificateCheck

Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host "`nCORS Headers:" -ForegroundColor Cyan
$response.Headers.GetEnumerator() | Where-Object { $_.Key -like "Access-Control*" } | ForEach-Object {
  Write-Host "$($_.Key): $($_.Value)"
}

# Test actual login request
Write-Host "`n`nTesting actual login request..." -ForegroundColor Cyan
try {
  $loginResponse = Invoke-WebRequest -Method Post `
    -Uri "https://lunesalove.com/api/auth/login" `
    -ContentType "application/json" `
    -Body '{"email":"test@test.com","password":"test"}' `
    -SkipCertificateCheck
  
  Write-Host "Status: $($loginResponse.StatusCode)" -ForegroundColor Green
  Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    Write-Host "Response Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
  }
}
