import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") return [val];
  return [];
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, bio: user.bio, avatar: user.avatar,
    skillsTeach: normalizeStringArray(user.skillsTeach),
    skillsLearn: normalizeStringArray(user.skillsLearn),
    trustScore: user.trustScore || 0, sessionsCompleted: user.sessionsCompleted || 0,
    averageRating: user.averageRating || 0, pricePerHour: user.pricePerHour || 50,
    createdAt: user.createdAt,
  };
}

function calculateMatchScore(mentor: typeof usersTable.$inferSelect, skillName: string): number {
  let score = 0;
  const raw = mentor.skillsTeach;
  const teaches: string[] = Array.isArray(raw) ? (raw as string[]) : typeof raw === "string" ? [raw] : [];
  const exactMatch = teaches.some(s => s.toLowerCase() === skillName.toLowerCase());
  const partialMatch = teaches.some(s =>
    s.toLowerCase().includes(skillName.toLowerCase()) ||
    skillName.toLowerCase().includes(s.toLowerCase())
  );
  if (exactMatch) score += 50;
  else if (partialMatch) score += 25;
  else return 0;
  score += Math.min(Math.max(Number(mentor.averageRating) || 0, 0), 5) * 5;
  score += Math.min(Math.max(Number(mentor.trustScore) || 0, 0), 100) * 0.1;
  score += Math.min((Number(mentor.sessionsCompleted) || 0) * 0.5, 15);
  if (mentor.bio && mentor.bio.length > 20) score += 3;
  if (mentor.avatar) score += 2;
  score -= Math.min(Math.max(Number(mentor.pricePerHour) || 50, 10), 10000) * 0.02;
  score += Math.min(teaches.length * 0.5, 3);
  return Math.max(0, Math.round(score * 100) / 100);
}

router.get("/:skill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawSkill = decodeURIComponent(String(req.params.skill)).trim();
    const skillName = rawSkill.replace(/[^a-zA-Z0-9\s\-\/\.#\+]/g, "").trim().slice(0, 60);
    if (!skillName) { res.status(400).json({ error: "Skill name required" }); return; }
    const currentUserId = req.userId;
    const users = await db.select().from(usersTable);
    const result = users
      .filter(u => u.id !== Number(currentUserId))
      .map(mentor => ({ mentor, score: calculateMatchScore(mentor, skillName) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ mentor, score }) => ({
        user: formatUser(mentor),
        matchScore: score,
        skill: skillName,
        pricePerHour: Math.min(Math.max(Number(mentor.pricePerHour) || 50, 10), 10000),
        isTopRated: (Number(mentor.averageRating) || 0) >= 4.5,
        isExperienced: (Number(mentor.sessionsCompleted) || 0) >= 10,
        isVerified: (Number(mentor.trustScore) || 0) >= 50,
      }));
    res.json(result);
  } catch (err) {
    console.error("[matching] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
