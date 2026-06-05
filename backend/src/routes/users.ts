import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

function formatUser(user: any) {
  return {
    id:                  user.id,
    name:                user.name,
    email:               user.email,
    bio:                 user.bio ?? null,
    avatar:              user.avatar ?? null,
    location:            user.location ?? null,
    skillsTeach:         user.skillsTeach || [],
    skillsLearn:         user.skillsLearn || [],
    credits:             user.credits ?? 0,
    trustScore:          user.trustScore ?? 0,
    sessionsCompleted:   user.sessionsCompleted ?? 0,
    averageRating:       user.averageRating ?? 0,
    pricePerHour:        user.pricePerHour ?? 0,
    isAdmin:             user.isAdmin ?? false,
    currentStreak:       user.currentStreak ?? 0,
    longestStreak:       user.longestStreak ?? 0,
    lastActiveDate:      user.lastActiveDate ?? null,
    verifiedSkills:      user.verifiedSkills || [],
    badges:              user.badges || [],
    microSessionsCount:  user.microSessionsCount ?? 0,
    portfolioPublic:     user.portfolioPublic ?? true,
    seoSlug:             user.seoSlug ?? null,
    isPremium:           user.isPremium ?? false,
    createdAt:           user.createdAt,
  };
}

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.userId!),
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(user));
  } catch (err: any) {
    console.error("[users/me]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(user));
  } catch (err: any) {
    console.error("[users/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/portfolio/:slug — public SEO page
router.get("/portfolio/:slug", async (req, res) => {
  try {
    const allUsers = await db.select().from(usersTable);
    const user = allUsers.find((u: any) => u.seoSlug === req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    if (!(user as any).portfolioPublic) return res.status(403).json({ error: "Private profile" });
    res.json(formatUser(user));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users
router.get("/", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.sessionsCompleted));
    res.json(users.map(formatUser));
  } catch (err: any) {
    console.error("[users/]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me
const UpdateSchema = z.object({
  name:            z.string().min(2).max(100).optional(),
  bio:             z.string().max(500).optional(),
  location:        z.string().max(100).optional(),
  skillsTeach:     z.array(z.string()).optional(),
  skillsLearn:     z.array(z.string()).optional(),
  pricePerHour:    z.number().min(0).optional(),
  portfolioPublic: z.boolean().optional(),
  avatar:          z.string().url().optional(),
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = UpdateSchema.parse(req.body);
    const updated = await db.update(usersTable)
      .set(data as any)
      .where(eq(usersTable.id, req.userId!))
      .returning();
    if (!updated[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(updated[0]));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/streak
router.post("/streak", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.userId!),
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const last      = (user as any).lastActiveDate;

    if (last === today) {
      return res.json({ streak: (user as any).currentStreak ?? 0, message: "Already updated today" });
    }

    const newStreak  = last === yesterday ? ((user as any).currentStreak ?? 0) + 1 : 1;
    const newLongest = Math.max(newStreak, (user as any).longestStreak ?? 0);
    const bonus      = newStreak === 7 ? 10 : newStreak === 30 ? 30 : newStreak === 100 ? 100 : 0;

    await db.update(usersTable).set({
      currentStreak:  newStreak,
      longestStreak:  newLongest,
      lastActiveDate: today,
      credits:        user.credits + bonus,
    } as any).where(eq(usersTable.id, req.userId!));

    res.json({
      streak: newStreak,
      longestStreak: newLongest,
      bonusCredits: bonus,
      message: bonus > 0 ? `🔥 ${newStreak}-day streak! +${bonus} bonus credits!` : "Streak updated!",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
