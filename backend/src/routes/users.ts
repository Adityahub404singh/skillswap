import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

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
    pricePerHour: user.pricePerHour || 50,
    createdAt: user.createdAt,
  };
}

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const updateSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  skillsTeach: z.array(z.string()).optional(),
  skillsLearn: z.array(z.string()).optional(),
  pricePerHour: z.number().int().min(10).max(500).optional(),
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = updateSchema.parse(req.body);
    const [user] = await db.update(usersTable).set(body).where(eq(usersTable.id, req.userId!)).returning();
    res.json(formatUser(user));
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Bad Request", message: err.message }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;