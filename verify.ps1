Write-Host ""
Write-Host "=== 1. Checking frontend discover.tsx for correct endpoint ===" -ForegroundColor Cyan

$frontendFile = 'src\pages\discover.tsx'

if (-Not (Test-Path $frontendFile)) {
    Write-Host "FILE NOT FOUND: $frontendFile (run this script from project root)" -ForegroundColor Red
    exit 1
}

$content = Get-Content $frontendFile -Raw

if ($content -match '/match/profiles' -or $content -match '/match/swipe') {
    Write-Host "OLD BUGGY CODE STILL PRESENT - found /match/profiles or /match/swipe" -ForegroundColor Red
    Write-Host "You have not replaced the file yet." -ForegroundColor Yellow
} else {
    Write-Host "OK - No /match/... references found" -ForegroundColor Green
}

if ($content -match '/discover/profiles' -and $content -match '/discover/swipe') {
    Write-Host "OK - Correct /discover/profiles and /discover/swipe endpoints found" -ForegroundColor Green
} else {
    Write-Host "MISSING - Correct endpoints not found, fix not applied" -ForegroundColor Red
}

if ($content -match 'pb-32') {
    Write-Host "OK - Layout fix pb-32 applied" -ForegroundColor Green
} else {
    Write-Host "WARNING - Layout fix pb-32 not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 2. Checking backend route registration ===" -ForegroundColor Cyan

$backendFile = 'backend\src\index.ts'
if (Test-Path $backendFile) {
    $backendContent = Get-Content $backendFile -Raw
    if ($backendContent -match '/api/discover') {
        Write-Host "OK - Backend confirms route is mounted at /api/discover" -ForegroundColor Green
    } else {
        Write-Host "WARNING - Could not confirm /api/discover mount in index.ts" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING - backend\src\index.ts not found, skipping" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 3. Live API test (requires backend running and valid token) ===" -ForegroundColor Cyan
Write-Host "Paste your skillswap_token or press Enter to skip:" -ForegroundColor Yellow
$token = Read-Host 'Token'

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Skipping live API test." -ForegroundColor Yellow
} else {
    $apiUrl = 'https://skillswap-b59w.onrender.com/api/discover/profiles'
    Write-Host "Calling: $apiUrl" -ForegroundColor Gray
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "OK - API responded successfully" -ForegroundColor Green
        Write-Host ("Profiles returned: " + $response.Count) -ForegroundColor Gray
        foreach ($p in $response) {
            $hasRealPhoto = $p.avatar -and $p.avatar -ne ''
            if ($hasRealPhoto) {
                $photoStatus = 'HAS PHOTO'
            } else {
                $photoStatus = 'NO PHOTO'
            }
            Write-Host ("- " + $p.name + ": " + $photoStatus) -ForegroundColor Gray
        }
    } catch {
        Write-Host ("API call failed: " + $_.Exception.Message) -ForegroundColor Red
        Write-Host "Check: is backend awake (Render free tier sleeps), is token valid or expired?" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""