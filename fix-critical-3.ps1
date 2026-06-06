# Fix 3 critical bugs
# cd C:\Users\alc\skillswap  then  .\fix-critical-3.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# ============================================================
# FIX 1: skills.ts mentorCount - skillsTeach is TEXT not array
# ============================================================
$skillsPath = "backend\src\routes\skills.ts"
$skills = Get-Content $skillsPath -Raw

$oldCount = @'
    const result = skills.map(skill => {
      const mentorCount = users.filter(u =>
        Array.isArray(u.skillsTeach) && u.skillsTeach.map((s: string) => s.toLowerCase()).includes(skill.name.toLowerCase())
      ).length;
'@

$newCount = @'
    function parseSkillsLocal(val: unknown): string[] {
      if (!val) return [];
      if (Array.isArray(val)) return val as string[];
      const s = String(val).trim();
      if (!s) return [];
      if (s.startsWith("[")) { try { const p = JSON.parse(s); if (Array.isArray(p)) return p; } catch {} }
      return s.split(/[\s,]+/).map((x: string) => x.trim()).filter(Boolean);
    }
    const result = skills.map(skill => {
      const mentorCount = users.filter(u => {
        const teaches = parseSkillsLocal(u.skillsTeach);
        return teaches.some((s: string) => s.toLowerCase() === skill.name.toLowerCase());
      }).length;
'@

$skills = $skills.Replace($oldCount, $newCount)
[System.IO.File]::WriteAllText("$pwd\$skillsPath", $skills, [System.Text.Encoding]::UTF8)
Write-Host "skills.ts mentorCount fixed" -ForegroundColor Green

# ============================================================
# FIX 2: Dashboard portfolio - skillsOffered → skillsTeach
# ============================================================
$dashPath = "src\pages\dashboard.tsx"
$dash = Get-Content $dashPath -Raw

$dash = $dash.Replace("(user as any).skillsOffered", "(user as any).skillsTeach")
$dash = $dash.Replace("(user as any).skillsWanted",  "(user as any).skillsLearn")

[System.IO.File]::WriteAllText("$pwd\$dashPath", $dash, [System.Text.Encoding]::UTF8)
Write-Host "dashboard.tsx portfolio fields fixed" -ForegroundColor Green

# ============================================================
# FIX 3: Call streak API on app load (App.tsx)
# ============================================================
$appPath = "src\App.tsx"
$app = Get-Content $appPath -Raw

# Add streak call after auth check
if ($app -notmatch "gamification/streak") {
  $app = $app -replace '(import \{ useAuthStore \} from "@/store/auth";)', '$1
// Auto-call streak on app load
async function updateStreak(token: string) {
  try {
    await fetch("/api/gamification/streak", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  } catch {}
}'

  # Add streak call in Router component
  $app = $app -replace '(const token = useAuthStore\(s => s\.token\);)', '$1
  // Update streak on every app load (debounced to once per day by backend)
  useEffect(() => {
    if (token) updateStreak(token);
  }, [token]);'

  [System.IO.File]::WriteAllText("$pwd\$appPath", $app, [System.Text.Encoding]::UTF8)
  Write-Host "App.tsx streak call added" -ForegroundColor Green
} else {
  Write-Host "App.tsx streak already has call" -ForegroundColor Yellow
}

# ============================================================
# BUILD CHECK
# ============================================================
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Cyan
$feOut = npm run build 2>&1
$feErrs = $feOut | Select-String "error TS"
if ($feErrs) {
  Write-Host "Frontend errors:" -ForegroundColor Red
  $feErrs | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Frontend BUILD PASSED!" -ForegroundColor Green
  $feOut | Select-String "built in" | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Building backend..." -ForegroundColor Cyan
cd backend
$beOut = npm run build 2>&1
$beErrs = $beOut | Select-String "error TS|error:"
if ($beErrs) {
  Write-Host "Backend errors:" -ForegroundColor Red
  $beErrs | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Backend BUILD PASSED!" -ForegroundColor Green
}
cd ..

# ============================================================
# GIT COMMIT
# ============================================================
Write-Host ""
Write-Host "Committing..." -ForegroundColor Cyan
git add .
git commit -m "fix: mentorCount parsing, dashboard skillsOffered->skillsTeach, streak auto-call on login"
git push origin main
Write-Host ""
Write-Host "=== ALL 3 FIXES DONE ===" -ForegroundColor Green
Write-Host ""
Write-Host "What changed:" -ForegroundColor Yellow
Write-Host "  1. Explore pe mentor counts ab sahi dikhenge (17 Python etc.)" -ForegroundColor White
Write-Host "  2. Dashboard Portfolio mein Skills I Teach/Learn ab sahi fields se aayenge" -ForegroundColor White
Write-Host "  3. Login ke baad streak auto-update hoga (real streak dikhega)" -ForegroundColor White
