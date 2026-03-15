import { Router, type IRouter } from "express";
import { db, usersTable, ratingsTable } from "@workspace/db";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    skillsTeach: user.skillsTeach || [],
    skillsLearn: user.skillsLearn || [],
    credits: user.credits,
    trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating,
    createdAt: user.createdAt,
  };
}

router.get("/:skill", async (req, res) => {
  try {
    const skillName = req.params.skill.toLowerCase();

    const users = await db.select().from(usersTable);

    const mentors = users.filter(u =>
      Array.isArray(u.skillsTeach) &&
      u.skillsTeach.some((s: string) => s.toLowerCase().includes(skillName) || skillName.includes(s.toLowerCase()))
    );

    const result = mentors.map(mentor => {
      const rating = mentor.averageRating || 0;
      const trust = mentor.trustScore || 0;
      const sessions = mentor.sessionsCompleted || 0;

      const matchScore = rating * 0.5 + trust * 0.3 + Math.min(sessions, 100) * 0.002;

      return {
        user: formatUser(mentor),
        matchScore: Math.round(matchScore * 100) / 100,
        skill: req.params.skill,
      };
    });

    result.sort((a, b) => b.matchScore - a.matchScore);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
