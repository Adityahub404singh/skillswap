# Fix matching.ts completely + rebuild + test
# cd C:\Users\alc\skillswap\backend  then  .\fix-matching.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$matchingPath = "src\routes\matching.ts"

# Write complete fixed matching.ts
$content = @'
import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function parseSkills(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    const s = val.trim();
    if (s.startsWith("[")) {
      try { const p = JSON.parse(s); if (Array.isArray(p)) return p; } catch {}
    }
    return s.split(",").map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function formatUser(user: any) {
  return {
    id: user.id, name: user.name, bio: user.bio, avatar: user.avatar,
    skillsTeach: parseSkills(user.skillsTeach),
    skillsLearn: parseSkills(user.skillsLearn),
    trustScore: user.trustScore || 0,
    sessionsCompleted: user.sessionsCompleted || 0,
    averageRating: user.averageRating || 0,
    pricePerHour: user.pricePerHour || 10,
    currentStreak: user.currentStreak || 0,
    location: user.location || null,
    createdAt: user.createdAt,
  };
}

function calculateMatchScore(mentor: any, skillName: string): number {
  const teaches = parseSkills(mentor.skillsTeach);
  const skill = skillName.toLowerCase().trim();

  const exactMatch   = teaches.some(s => s.toLowerCase().trim() === skill);
  const partialMatch = teaches.some(s =>
    s.toLowerCase().includes(skill) || skill.includes(s.toLowerCase())
  );

  if (!exactMatch && !partialMatch) return 0;

  let score = exactMatch ? 50 : 25;
  score += Math.min(Number(mentor.averageRating)   || 0, 5)   * 5;
  score += Math.min(Number(mentor.trustScore)       || 0, 100) * 0.1;
  score += Math.min((Number(mentor.sessionsCompleted) || 0) * 0.5, 15);
  if (mentor.bio && mentor.bio.length > 20) score += 3;
  if (mentor.avatar) score += 2;
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
        user:         formatUser(mentor),
        matchScore:   score,
        skill:        skillName,
        pricePerHour: Number(mentor.pricePerHour) || 10,
        isTopRated:   (Number(mentor.averageRating)    || 0) >= 4.5,
        isExperienced:(Number(mentor.sessionsCompleted) || 0) >= 10,
        isVerified:   (Number(mentor.trustScore)        || 0) >= 50,
      }));

    console.log(`[match/${skillName}] found ${result.length} mentors`);
    res.json(result);
  } catch (err: any) {
    console.error("[matching] Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
'@

[System.IO.File]::WriteAllText("$pwd\$matchingPath", $content, [System.Text.Encoding]::UTF8)
Write-Host "matching.ts rewritten" -ForegroundColor Green

# Build
Write-Host "Building..." -ForegroundColor Cyan
$build = npm run build 2>&1
$errors = $build | Select-String "error"
if ($errors) {
  Write-Host "Build errors:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Build PASSED!" -ForegroundColor Green
  $build | Select-String "built in" | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
}

Write-Host ""
Write-Host "Ab yeh karo:" -ForegroundColor Yellow
Write-Host "  1. Backend restart: npm run dev" -ForegroundColor White
Write-Host "  2. Test: GET http://localhost:5000/api/match/Python" -ForegroundColor White
