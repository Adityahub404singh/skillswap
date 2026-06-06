import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq, sql, desc, or, gt } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/streak", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.userId!);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const lastActive = user.lastActiveDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = user.currentStreak || 0;
    if (lastActive === today) {
      res.json({ streak: newStreak, message: "Already updated today" });
      return;
    } else if (lastActive === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, user.longestStreak || 0);
    const newBadges = Array.isArray(user.badges) ? [...user.badges] : [];
    if (newStreak >= 7 && !newBadges.includes("7-day-streak")) newBadges.push("7-day-streak");
    if (newStreak >= 30 && !newBadges.includes("30-day-legend")) newBadges.push("30-day-legend");

    const bonus = newStreak === 7 ? 10 : newStreak === 30 ? 30 : newStreak === 100 ? 100 : 0;

    await db.update(usersTable).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      badges: newBadges,
      credits: sql`${usersTable.credits} + ${bonus}`
    }).where(eq(usersTable.id, userId));

    res.json({ streak: newStreak, longestStreak: newLongest, badges: newBadges, bonusCredits: bonus });
  } catch (err) {
    console.error("[streak]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(or(gt(usersTable.sessionsCompleted, 0), gt(usersTable.trustScore, 0)))
      .orderBy(desc(usersTable.trustScore))
      .limit(20);

    const leaderboard = users.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        trustScore: u.trustScore || 0,
        sessionsCompleted: u.sessionsCompleted || 0,
        averageRating: u.averageRating || 0,
        currentStreak: u.currentStreak || 0,
        badges: u.badges || [],
        verifiedSkills: u.verifiedSkills || [],
      }));
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
