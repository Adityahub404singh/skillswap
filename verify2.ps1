Write-Host ""
Write-Host "=== 1. Checking .env files reverted (no /api suffix) ===" -ForegroundColor Cyan

$envFile = '.env'
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'localhost:3001/api') {
        Write-Host "BAD - .env still has /api suffix, should be just localhost:3001" -ForegroundColor Red
    } elseif ($envContent -match 'localhost:3001') {
        Write-Host "OK - .env correctly set to localhost:3001 (no /api)" -ForegroundColor Green
    } else {
        Write-Host "WARNING - .env does not contain expected localhost:3001 value" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING - .env not found in current directory" -ForegroundColor Yellow
}

$envProdFile = 'frontend\.env.production'
if (Test-Path $envProdFile) {
    $envProdContent = Get-Content $envProdFile -Raw
    if ($envProdContent -match 'onrender.com/api') {
        Write-Host "BAD - .env.production still has /api suffix" -ForegroundColor Red
    } elseif ($envProdContent -match 'onrender.com') {
        Write-Host "OK - .env.production correctly set without /api suffix" -ForegroundColor Green
    } else {
        Write-Host "WARNING - .env.production does not contain expected onrender.com value" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING - frontend\.env.production not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 2. Checking discover.tsx has explicit /api prefix ===" -ForegroundColor Cyan

$discoverFile = 'src\pages\discover.tsx'
if (Test-Path $discoverFile) {
    $discoverContent = Get-Content $discoverFile -Raw
    if ($discoverContent -match '/api/discover/profiles' -and $discoverContent -match '/api/discover/swipe') {
        Write-Host "OK - discover.tsx uses /api/discover/profiles and /api/discover/swipe" -ForegroundColor Green
    } else {
        Write-Host "BAD - discover.tsx missing correct /api/discover/... endpoints" -ForegroundColor Red
    }
    if ($discoverContent -match 'pb-32') {
        Write-Host "OK - Layout fix (pb-32) still present" -ForegroundColor Green
    } else {
        Write-Host "WARNING - Layout fix (pb-32) not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING - src\pages\discover.tsx not found (run from project root)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 3. Checking other pages still use /api/... pattern (no breakage) ===" -ForegroundColor Cyan

$otherFiles = @('src\pages\quiz.tsx', 'src\pages\book-session.tsx', 'src\pages\wallet.tsx')
foreach ($f in $otherFiles) {
    if (Test-Path $f) {
        $c = Get-Content $f -Raw
        if ($c -match '/api/api/') {
            Write-Host ("BAD - " + $f + " has double /api/api/ - this will break!") -ForegroundColor Red
        } elseif ($c -match '\$\{API_URL\}/api/' -or $c -match 'fetch\(.api/') {
            Write-Host ("OK - " + $f + " uses single /api/ prefix") -ForegroundColor Green
        } else {
            Write-Host ("INFO - " + $f + " - could not confirm pattern, check manually") -ForegroundColor Gray
        }
    } else {
        Write-Host ("INFO - " + $f + " not found, skipping") -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== 4. Live API tests (requires local backend running on :3001) ===" -ForegroundColor Cyan
Write-Host "Paste your skillswap_token or press Enter to skip:" -ForegroundColor Yellow
$token = Read-Host 'Token'

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Skipping live API tests." -ForegroundColor Yellow
} else {
    $headers = @{ Authorization = "Bearer $token" }

    Write-Host "`nTesting discover/profiles..." -ForegroundColor Gray
    try {
        $r1 = Invoke-RestMethod -Uri 'http://localhost:3001/api/discover/profiles' -Headers $headers -Method Get -ErrorAction Stop
        Write-Host ("OK - discover/profiles returned " + $r1.Count + " profiles") -ForegroundColor Green
        foreach ($p in $r1) {
            $hasPhoto = $p.avatar -and $p.avatar -ne ''
            $status = if ($hasPhoto) { 'HAS PHOTO' } else { 'NO PHOTO' }
            Write-Host ("  - " + $p.name + ": " + $status) -ForegroundColor Gray
        }
    } catch {
        Write-Host ("BAD - discover/profiles failed: " + $_.Exception.Message) -ForegroundColor Red
    }

    Write-Host "`nTesting quiz/stats (sanity check, should NOT 404 from double /api)..." -ForegroundColor Gray
    try {
        $r2 = Invoke-RestMethod -Uri 'http://localhost:3001/api/quiz/stats' -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "OK - quiz/stats responded successfully" -ForegroundColor Green
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match '404') {
            Write-Host "BAD - quiz/stats 404'd, check for double /api/api issue" -ForegroundColor Red
        } else {
            Write-Host ("INFO - quiz/stats error (may be expected if route requires different auth/data): " + $msg) -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""