# Fix matching.ts - remove passwordHash + fix skillsTeach parsing
# cd C:\Users\alc\skillswap\backend  then  .\fix-matching-final.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$content = @'
import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

// Handles: ["Python","DSA"] | "Python DSA" | "Python,DSA" | null
function parseSkills(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return (val as string[]).filter(Boolean);
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];
    // JSON array
    if (s.startsWith("[")) {
      try { const p = JSON.parse(s); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    }
    // Comma or space separated
    const sep = s.includes(",") ? "," : " ";
    return s.split(sep).map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function safeFormatMentor(user: any) {
  return {
    id:                user.id,
    name:              user.name,
    bio:               user.bio ?? null,
    avatar:            user.avatar ?? null,
    location:          user.location ?? null,
    skillsTeach:       parseSkills(user.skillsTeach),
    skillsLearn:       parseSkills(user.skillsLearn),
    trustScore:        user.trustScore ?? 0,
    sessionsCompleted: user.sessionsCompleted ?? 0,
    averageRating:     user.averageRating ?? 0,
    pricePerHour:      user.pricePerHour ?? 10,
    currentStreak:     user.currentStreak ?? 0,
    isPremium:         user.isPremium ?? false,
    createdAt:         user.createdAt,
    // NO passwordHash, NO email
  };
}

function calculateMatchScore(mentor: any, skillName: string): number {
  const teaches = parseSkills(mentor.skillsTeach);
  const skill   = skillName.toLowerCase().trim();

  const exactMatch   = teaches.some(s => s.toLowerCase().trim() === skill);
  const partialMatch = teaches.some(s =>
    s.toLowerCase().includes(skill) || skill.includes(s.toLowerCase())
  );

  if (!exactMatch && !partialMatch) return 0;

  let score = exactMatch ? 50 : 25;
  score += Math.min(Number(mentor.averageRating)     ?? 0, 5)   * 5;
  score += Math.min(Number(mentor.trustScore)         ?? 0, 100) * 0.1;
  score += Math.min((Number(mentor.sessionsCompleted) ?? 0) * 0.5, 15);
  if (mentor.bio   && String(mentor.bio).length   > 20) score += 3;
  if (mentor.avatar) score += 2;
  if (mentor.isPremium) score += 5;
  score += Math.min(teaches.length * 0.5, 3);
  return Math.max(0, Math.round(score * 100) / 100);
}

// GET /api/match/:skill
router.get("/:skill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const skillName = decodeURIComponent(String(req.params.skill))
      .replace(/[^a-zA-Z0-9\s\-\/\.#\+]/g, "").trim().slice(0, 60);

    if (!skillName) return res.status(400).json({ error: "Skill name required" });

    const users = await db.select().from(usersTable);

    const result = users
      .filter(u => u.id !== Number(req.userId))
      .map(mentor => ({ mentor, score: calculateMatchScore(mentor, skillName) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ mentor, score }) => ({
        user:          safeFormatMentor(mentor),
        matchScore:    score,
        skill:         skillName,
        pricePerHour:  Number(mentor.pricePerHour) || 10,
        isTopRated:    (Number(mentor.averageRating)     ?? 0) >= 4.5,
        isExperienced: (Number(mentor.sessionsCompleted) ?? 0) >= 10,
        isVerified:    (Number(mentor.trustScore)        ?? 0) >= 50,
      }));

    console.log(`[match/${skillName}] ${result.length} mentors found`);
    res.json(result);
  } catch (err: any) {
    console.error("[matching]", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
'@

[System.IO.File]::WriteAllText("$pwd\src\routes\matching.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "matching.ts fixed - passwordHash removed, skills parsing fixed" -ForegroundColor Green

# tsx watch auto-reloads - wait 5s then test
Write-Host "Waiting for tsx reload..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$TOKEN = (Invoke-RestMethod -Method POST `
  -Uri "http://localhost:5000/api/auth/login" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"singhaditya4560@gmail.com","password":"Admin@123"}').token

Write-Host ""
Write-Host "Testing /api/match/Python..." -ForegroundColor Cyan
$result = Invoke-RestMethod -Method GET `
  -Uri "http://localhost:5000/api/match/Python" `
  -Headers @{"Authorization"="Bearer $TOKEN"}

Write-Host "Found $($result.Count) Python mentors:" -ForegroundColor Green
$result | Select-Object -First 5 | ForEach-Object {
  Write-Host "  $($_.user.name) | skills: $($_.user.skillsTeach -join ', ') | score: $($_.matchScore)" -ForegroundColor White
}

Write-Host ""
Write-Host "Commit karo:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\alc\skillswap" -ForegroundColor White
Write-Host "  git add . && git commit -m 'fix: matching route added to app.ts, skills parsing fixed, passwordHash removed from response'" -ForegroundColor White
Write-Host "  git push origin main" -ForegroundColor White
