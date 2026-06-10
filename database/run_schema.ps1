$sql = Get-Content "C:\Users\jesus\.gemini\antigravity\scratch\ma-baker-recruitment\database\schema.sql" -Raw

$body = @{
    query = $sql
} | ConvertTo-Json -Depth 10

$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
    "Content-Type" = "application/json"
}

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "ERROR: Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar."
    exit 1
}

try {
    $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS:" ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "ERROR: $_"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
