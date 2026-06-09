import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { pgTable, serial, integer, text, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { desc, eq, sql } from "drizzle-orm";

const usersTable = pgTable("users", {
  id:                 serial("id").primaryKey(),
  name:               text("name").notNull(),
  email:              text("email").notNull(),
  credits:            integer("credits").notNull().default(50),
  trustScore:         integer("trust_score").notNull().default(0),
  sessionsCompleted:  integer("sessions_completed").notNull().default(0),
  averageRating:      real("average_rating").notNull().default(0),
  isAdmin:            integer("is_admin").default(0),
  isPremium:          boolean("is_premium").notNull().default(false),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  skillsTeach:        jsonb("skills_teach").default(sql`'[]'::jsonb`),
});

const sessionsTable = pgTable("sessions", {
  id:              serial("id").primaryKey(),
  mentorId:        integer("mentor_id").notNull(),
  studentId:       integer("student_id").notNull(),
  skill:           text("skill").notNull(),
  status:          text("status").notNull().default("requested"),
  creditsAmount:   integer("credits_amount").notNull().default(10),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  amount:      integer("amount").notNull(),
  type:        text("type").notNull(),
  description: text("description").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

const router: IRouter = Router();

// GET /api/admin/stats
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const sessions = await db.select().from(sessionsTable);
    const completed = sessions.filter(s => s.status === "completed");
    res.json({
      totalUsers: users.length,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalCreditsInSystem: users.reduce((sum, u) => sum + u.credits, 0),
      recentUsers: users.slice(-5)
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)));
});

// GET /api/admin/sessions
router.get("/sessions", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt)));
});

// GET /api/admin/transactions
router.get("/transactions", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)));
});

// POST /api/admin/users/:id/credits (Add/Deduct credits manually)
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { amount, reason } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable).set({ credits: user.credits + amount }).where(eq(usersTable.id, userId));
    await db.insert(transactionsTable).values({
      userId, type: "bonus", amount, description: reason || "Admin credit grant",
    });

    res.json({ success: true, newBalance: user.credits + amount });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/sessions/:id/cancel
router.patch("/sessions/:id/cancel", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id - ban user
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.update(usersTable).set({ trustScore: -999 } as any).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User banned" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/transactions/:id/complete
router.patch("/transactions/:id/complete", requireAuth, requireAdmin, async (req, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        await db.update(transactionsTable)
            .set({ type: "withdrawal_complete", description: sql`${transactionsTable.description} || ' - PAID'` })
            .where(eq(transactionsTable.id, txId));
        res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/users/:id/verify
router.patch("/users/:id/verify", requireAuth, requireAdmin, async (req, res) => {
  try {
      const userId = parseInt(req.params.id as string);
      const { isPremium } = req.body;
      await db.update(usersTable).set({ isPremium }).where(eq(usersTable.id, userId));
      res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
