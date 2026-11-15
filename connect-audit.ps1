
cd "$env:USERPROFILE\skillswap\backend"

Write-Host "`n===== CONNECT SERVICE: ACTIVITY QUERIES ====="
Select-String .\src\connect\services\connect.js `
  -Pattern 'listActivities|connect_activities|SELECT|ORDER BY' `
  -Context 4,8

Write-Host "`n===== CONNECT ERROR HANDLER ====="
Get-Content .\src\connect\middleware\errors.js

Write-Host "`n===== CONNECT ROUTE: PUBLIC ENDPOINT ====="
Select-String .\src\connect\routes\index.js `
  -Pattern 'router.get|listActivities|health' `
  -Context 2,5

Write-Host "`n===== MIGRATION CONTENTS: CONNECT REFERENCES ====="
Get-ChildItem .\drizzle,.\migrations -File -Filter *.sql -ErrorAction SilentlyContinue |
  ForEach-Object {
    Select-String -Path $_.FullName -Pattern 'connect_|CREATE TABLE|REFERENCES' |
      ForEach-Object { "$($_.Path):$($_.LineNumber) $($_.Line.Trim())" }
  }
