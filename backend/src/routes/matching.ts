import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { ilike } from "drizzle-orm";

const router: IRouter = Router();

function parseSkills(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return (val as string[]).filter(Boolean);
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try { const p = JSON.parse(s); if (Array.isArray(p)) return p.filter(Boolean); } catch {}
    }
    const sep = s.includes(",") ? "," : " ";
    return s.split(sep).map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function safeFormatMentor(user: any) {
  return {
    id: user.id, name: user.name, bio: user.bio ?? null, avatar: user.avatar ?? null, location: user.location ?? null,
    skillsTeach: parseSkills(user.skillsTeach), skillsLearn: parseSkills(user.skillsLearn),
    trustScore: user.trustScore ?? 0, sessionsCompleted: user.sessionsCompleted ?? 0,
    averageRating: user.averageRating ?? 0, pricePerHour: user.pricePerHour ?? 10,
    currentStreak: user.currentStreak ?? 0, isPremium: user.isPremium ?? false, createdAt: user.createdAt,
  };
}

function calculateMatchScore(mentor: any, skillName: string): number {
  const teaches = parseSkills(mentor.skillsTeach);
  const skill = skillName.toLowerCase().trim();
  const exactMatch = teaches.some(s => s.toLowerCase().trim() === skill);
  const partialMatch = teaches.some(s => s.toLowerCase().includes(skill) || skill.includes(s.toLowerCase()));

  if (!exactMatch && !partialMatch) return 0;

  let score = exactMatch ? 50 : 25;
  score += Math.min(Number(mentor.averageRating) ?? 0, 5) * 5;
  score += Math.min(Number(mentor.trustScore) ?? 0, 100) * 0.1;
  score += Math.min((Number(mentor.sessionsCompleted) ?? 0) * 0.5, 15);
  if (mentor.bio && String(mentor.bio).length > 20) score += 3;
  if (mentor.avatar) score += 2;
  if (mentor.isPremium) score += 5;
  score += Math.min(teaches.length * 0.5, 3);
  return Math.max(0, Math.round(score * 100) / 100);
}

router.get("/:skill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const skillName = decodeURIComponent(String(req.params.skill)).replace(/[^a-zA-Z0-9\s\-\/\.#\+]/g, "").trim().slice(0, 60);
    if (!skillName) return res.status(400).json({ error: "Skill name required" });

    // PERF FIX: Fetch ONLY potential matches from DB using ILIKE, capped at 200 to prevent OOM Server Crash
    const users = await db.select().from(usersTable)
      .where(ilike(usersTable.skillsTeach, `%${skillName}%`))
      .limit(200);

    const result = users
      .filter(u => u.id !== Number(req.userId))
      .map(mentor => ({ mentor, score: calculateMatchScore(mentor, skillName) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ mentor, score }) => ({
        user: safeFormatMentor(mentor),
        matchScore: score, skill: skillName, pricePerHour: Number(mentor.pricePerHour) || 10,
        isTopRated: (Number(mentor.averageRating) ?? 0) >= 4.5,
        isExperienced: (Number(mentor.sessionsCompleted) ?? 0) >= 10,
        isVerified: (Number(mentor.trustScore) ?? 0) >= 50,
      }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;