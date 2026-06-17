// backend/src/routes/gamification.ts

import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, sql, desc, or, gt } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { usersTable } from "../schema/index.js";

const router: IRouter = Router();

router.post("/streak", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = Number(req.userId!);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { return res.status(404).json({ error: "Not Found" }); }

    const today = new Date().toISOString().split("T")[0];
    const lastActive = user.lastActiveDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = user.currentStreak || 0;
    if (lastActive === today) {
      return res.json({ streak: newStreak, message: "Already updated today" });
    } else if (lastActive === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, user.longestStreak || 0);
    
    // 🔥 FIX: Array extraction using badgesV2 
    const newBadges = Array.isArray(user.badgesV2) ? [...user.badgesV2] : [];
    if (newStreak >= 7 && !newBadges.includes("7-day-streak")) newBadges.push("7-day-streak");
    if (newStreak >= 30 && !newBadges.includes("30-day-legend")) newBadges.push("30-day-legend");

    const bonus = newStreak === 7 ? 10 : newStreak === 30 ? 30 : newStreak === 100 ? 100 : 0;

    await db.update(usersTable).set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      badgesV2: newBadges, // 🔥 FIX: Saving to DB as badgesV2
      credits: sql`${usersTable.credits} + ${bonus}`
    }).where(eq(usersTable.id, userId));

    res.json({ streak: newStreak, longestStreak: newLongest, badges: newBadges, bonusCredits: bonus });
  } catch (err) {
    console.error("[streak fallback]", err);
    res.json({ streak: 0, message: "Fallback mode active" });
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
        // 🔥 FIX: Read from badgesV2 and verifiedSkillsV2, but send as expected by frontend
        badges: u.badgesV2 || [], 
        verifiedSkills: u.verifiedSkillsV2 || [], 
      }));
    res.json(leaderboard);
  } catch (err) {
    console.error("[leaderboard fallback]", err);
    res.json([]);
  }
});

export default router;