import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq, sql } from "drizzle-orm";
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
    const newBadges = [...(user.badges || [])];
    if (newStreak >= 7 && !newBadges.includes("7-day-streak")) newBadges.push("7-day-streak");
    if (newStreak >= 30 && !newBadges.includes("30-day-legend")) newBadges.push("30-day-legend");

    await db.update(usersTable).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      badges: newBadges,
    }).where(eq(usersTable.id, userId));

    res.json({ streak: newStreak, longestStreak: newLongest, badges: newBadges });
  } catch (err) {
    console.error("[streak]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const leaderboard = users
      .filter(u => (u.sessionsCompleted || 0) > 0 || (u.trustScore || 0) > 0)
      .map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        trustScore: u.trustScore || 0,
        sessionsCompleted: u.sessionsCompleted || 0,
        averageRating: u.averageRating || 0,
        currentStreak: u.currentStreak || 0,
        badges: u.badges || [],
        verifiedSkills: u.verifiedSkills || [],
      }))
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 20);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify-skill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.userId!);
    const { skill } = req.body;
    if (!skill) { res.status(400).json({ error: "Skill required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }

    const verified = user.verifiedSkills || [];
    if (verified.includes(skill)) {
      res.json({ message: "Already verified", verifiedSkills: verified });
      return;
    }

    const newVerified = [...verified, skill];
    const newBadges = [...(user.badges || [])];
    if (!newBadges.includes("verified-expert")) newBadges.push("verified-expert");

    await db.update(usersTable).set({
      verifiedSkills: newVerified,
      badges: newBadges,
      trustScore: sql`${usersTable.trustScore} + 10`,
    }).where(eq(usersTable.id, userId));

    res.json({ success: true, verifiedSkills: newVerified, badges: newBadges });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;