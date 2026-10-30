$sql = Get-Content "C:\Users\jesus\.gemini\antigravity\scratch\ma-baker-recruitment\database\schema.sql" -Raw

$body = @{
    query = $sql
} | ConvertTo-Json -Depth 10

$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1ODgwOCwiZXhwIjoyMDg4NDM0ODA4fQ.s7yC5ODssUgqHjH0PsAhTZuNQ1R-lMuJAt62OKDwryg"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2twZGl4ZHl4ZGJ2cGFwcXJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg1ODgwOCwiZXhwIjoyMDg4NDM0ODA4fQ.s7yC5ODssUgqHjH0PsAhTZuNQ1R-lMuJAt62OKDwryg"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://znskpdixdyxdbvpapqrg.supabase.co/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS:" ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "ERROR: $_"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
