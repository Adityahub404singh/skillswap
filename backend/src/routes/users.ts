import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { usersTable } from "../schema/index.js";

const router: IRouter = Router();

function parseJsonField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "string") {
      try {
        const reparsed = JSON.parse(parsed);
        return Array.isArray(reparsed) ? reparsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatUser(user: any) {
  return {
    id:                  user.id,
    name:                user.name,
    email:               user.email,
    bio:                 user.bio ?? null,
    avatar:              user.avatar ?? null, 
    location:            user.location ?? null,
    skillsTeach:         parseJsonField(user.skillsTeachV2),
    skillsLearn:         parseJsonField(user.skillsLearnV2),
    verifiedSkills:      parseJsonField(user.verifiedSkillsV2),
    badges:              parseJsonField(user.badgesV2), 
    isPremium:           user.isPremiumUser ?? false,
    portfolioPublic:     user.isPortfolioPublic ?? true,
    credits:             user.credits ?? 0,
    trustScore:          user.trustScore ?? 0,
    sessionsCompleted:   user.sessionsCompleted ?? 0,
    averageRating:       user.averageRating ?? 0,
    pricePerHour:        user.pricePerHour ?? 0,
    isAdmin:             !!user.isAdmin,
    currentStreak:       user.currentStreak ?? 0,
    longestStreak:       user.longestStreak ?? 0,
    lastActiveDate:      user.lastActiveDate ?? null,
    microSessionsCount:  user.microSessionsCount ?? 0,
    seoSlug:             user.seoSlug ?? null,
    createdAt:           user.createdAt,
  };
}

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 🔥 EXPERT FIX: Removed the memory/bandwidth leak. Now queries DB directly for 1 user.
router.get("/portfolio/:slug", async (req, res) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.seoSlug, req.params.slug)).limit(1);
    if (!rows[0]) return res.status(404).json({ error: "Profile not found" });
    res.json(formatUser(rows[0]));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/", async (_req, res) => {
  try {
    // 🔥 EXPERT FIX: Re-added limit to prevent bandwidth disaster, but set to 100 to still show new mentors.
    const rows = await db.select().from(usersTable).orderBy(desc(usersTable.sessionsCompleted)).limit(100);
    res.json(rows.map(formatUser));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const UpdateSchema = z.object({
  name:            z.string().min(2).max(100).optional(),
  bio:             z.string().max(500).optional(),
  location:        z.string().max(100).optional(),
  skillsTeach:     z.array(z.string()).optional(),
  linkedinUrl:     z.string().optional(),
  skillsLearn:     z.array(z.string()).optional(),
  pricePerHour:    z.number().min(0).optional(),
  portfolioPublic: z.boolean().optional(),
  avatar:          z.string().optional(), 
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = UpdateSchema.parse(req.body);
    const updateData: any = { ...data };
    
    if (updateData.skillsTeach !== undefined) {
      updateData.skillsTeachV2 = updateData.skillsTeach;
      delete updateData.skillsTeach;
    }
    if (updateData.skillsLearn !== undefined) {
      updateData.skillsLearnV2 = updateData.skillsLearn;
      delete updateData.skillsLearn;
    }
    if (updateData.portfolioPublic !== undefined) {
      updateData.isPortfolioPublic = updateData.portfolioPublic;
      delete updateData.portfolioPublic;
    }

    const updated = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId!))
      .returning();
      
    if (!updated[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(updated[0]));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
