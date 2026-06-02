import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, bio: user.bio, avatar: user.avatar,
    skillsTeach: user.skillsTeach || [], skillsLearn: user.skillsLearn || [],
    trustScore: user.trustScore || 0, sessionsCompleted: user.sessionsCompleted || 0,
    averageRating: user.averageRating || 0, pricePerHour: user.pricePerHour || 50,
    createdAt: user.createdAt,
  };
}

function calculateMatchScore(mentor: typeof usersTable.$inferSelect, skillName: string): number {
  let score = 0;
  const teaches = (mentor.skillsTeach as string[]) || [];
  const exactMatch = teaches.some(s => s.toLowerCase() === skillName.toLowerCase());
  const partialMatch = teaches.some(s =>
    s.toLowerCase().includes(skillName.toLowerCase()) ||
    skillName.toLowerCase().includes(s.toLowerCase())
  );
  if (exactMatch) score += 50;
  else if (partialMatch) score += 25;
  else return 0;
  score += (mentor.averageRating || 0) * 5;
  score += (mentor.trustScore || 0) * 0.1;
  score += Math.min((mentor.sessionsCompleted || 0) * 0.5, 15);
  if (mentor.bio && mentor.bio.length > 20) score += 3;
  if (mentor.avatar) score += 2;
  score -= ((mentor.pricePerHour || 50) * 0.02);
  score += Math.min(teaches.length * 0.5, 3);
  return Math.max(0, Math.round(score * 100) / 100);
}

router.get("/:skill", async (req, res) => {
  try {
    const skillName = decodeURIComponent(req.params.skill).trim();
    if (!skillName) { res.status(400).json({ error: "Skill name required" }); return; }
    const users = await db.select().from(usersTable);
    const result = users
      .map(mentor => ({ mentor, score: calculateMatchScore(mentor, skillName) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ mentor, score }) => ({
        user: formatUser(mentor),
        matchScore: score,
        skill: skillName,
        pricePerHour: mentor.pricePerHour || 50,
        isTopRated: (mentor.averageRating || 0) >= 4.5,
        isExperienced: (mentor.sessionsCompleted || 0) >= 10,
        isVerified: (mentor.trustScore || 0) >= 50,
      }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;