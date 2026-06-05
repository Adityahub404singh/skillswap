import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import {
  pgTable, serial, integer, text, timestamp,
  real, varchar, boolean, jsonb
} from "drizzle-orm/pg-core";

// Exact DB column names from check-schema output
const usersTable = pgTable("users", {
  id:                  serial("id").primaryKey(),
  name:                text("name").notNull(),
  email:               text("email").notNull(),
  passwordHash:        text("password_hash").notNull(),
  bio:                 text("bio"),
  avatar:              text("avatar"),
  skillsTeach:         text("skills_teach"),
  skillsLearn:         text("skills_learn"),
  credits:             integer("credits").notNull().default(50),
  trustScore:          integer("trust_score").notNull().default(0),
  sessionsCompleted:   integer("sessions_completed").notNull().default(0),
  averageRating:       real("average_rating").notNull().default(0),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  pricePerHour:        integer("price_per_hour").notNull().default(0),
  isAdmin:             integer("is_admin").default(0),
  currentStreak:       integer("current_streak").notNull().default(0),
  longestStreak:       integer("longest_streak").notNull().default(0),
  lastActiveDate:      text("last_active_date"),
  verifiedSkills:      jsonb("verified_skills"),
  badges:              jsonb("badges"),
  location:            varchar("location", { length: 100 }),
  microSessionsCount:  integer("micro_sessions_count").notNull().default(0),
  portfolioPublic:     boolean("portfolio_public").notNull().default(true),
  seoSlug:             varchar("seo_slug", { length: 100 }),
  isPremium:           boolean("is_premium").notNull().default(false),
  premiumExpiresAt:    timestamp("premium_expires_at"),
  notificationLastSent: timestamp("notification_last_sent"),
});

const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  amount:      integer("amount").notNull(),
  type:        text("type").notNull(),
  description: text("description").notNull(),
  sessionId:   integer("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

function parseJsonField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function formatUser(user: any) {
  return {
    id:                  user.id,
    name:                user.name,
    email:               user.email,
    bio:                 user.bio ?? null,
    avatar:              user.avatar ?? null,
    location:            user.location ?? null,
    skillsTeach:         parseJsonField(user.skillsTeach),
    skillsLearn:         parseJsonField(user.skillsLearn),
    credits:             user.credits ?? 0,
    trustScore:          user.trustScore ?? 0,
    sessionsCompleted:   user.sessionsCompleted ?? 0,
    averageRating:       user.averageRating ?? 0,
    pricePerHour:        user.pricePerHour ?? 0,
    isAdmin:             !!user.isAdmin,
    currentStreak:       user.currentStreak ?? 0,
    longestStreak:       user.longestStreak ?? 0,
    lastActiveDate:      user.lastActiveDate ?? null,
    verifiedSkills:      parseJsonField(user.verifiedSkills),
    badges:              parseJsonField(user.badges),
    microSessionsCount:  user.microSessionsCount ?? 0,
    portfolioPublic:     user.portfolioPublic ?? true,
    seoSlug:             user.seoSlug ?? null,
    isPremium:           user.isPremium ?? false,
    createdAt:           user.createdAt,
  };
}

const router: IRouter = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
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
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
  } catch (err: any) {
    console.error("[users/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/portfolio/:slug
router.get("/portfolio/:slug", async (req, res) => {
  try {
    const all = await db.select().from(usersTable);
    const user = all.find(u => u.seoSlug === req.params.slug);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    if (!user.portfolioPublic) return res.status(403).json({ error: "Private profile" });
    res.json(formatUser(user));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(usersTable).orderBy(desc(usersTable.sessionsCompleted));
    res.json(rows.map(formatUser));
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
  avatar:          z.string().optional(),
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = UpdateSchema.parse(req.body);
    const updateData: any = { ...data };
    if (data.skillsTeach) updateData.skillsTeach = JSON.stringify(data.skillsTeach);
    if (data.skillsLearn) updateData.skillsLearn = JSON.stringify(data.skillsLearn);

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

// POST /api/users/streak
router.post("/streak", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const last      = user.lastActiveDate;

    if (last === today) {
      return res.json({ streak: user.currentStreak, message: "Already updated today" });
    }

    const newStreak  = last === yesterday ? user.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, user.longestStreak);
    const bonus      = newStreak === 7 ? 10 : newStreak === 30 ? 30 : newStreak === 100 ? 100 : 0;

    await db.update(usersTable).set({
      currentStreak:  newStreak,
      longestStreak:  newLongest,
      lastActiveDate: today,
      credits:        user.credits + bonus,
    }).where(eq(usersTable.id, req.userId!));

    // Log bonus if any
    if (bonus > 0) {
      await db.insert(transactionsTable).values({
        userId:      req.userId!,
        type:        "earned",
        amount:      bonus,
        description: `${newStreak}-day streak bonus!`,
      });
    }

    res.json({
      streak:       newStreak,
      longestStreak: newLongest,
      bonusCredits: bonus,
      message:      bonus > 0 ? `${newStreak}-day streak! +${bonus} bonus credits!` : "Streak updated!",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
