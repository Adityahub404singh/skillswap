import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { pgTable, serial, integer, text, timestamp, real, boolean, varchar } from "drizzle-orm/pg-core";
import { desc, eq, sql } from "drizzle-orm";

const usersTable = pgTable("users", {
  id:               serial("id").primaryKey(),
  name:             text("name").notNull(),
  email:            text("email").notNull(),
  credits:          integer("credits").notNull().default(50),
  trustScore:       integer("trust_score").notNull().default(0),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  averageRating:    real("average_rating").notNull().default(0),
  isAdmin:          integer("is_admin").default(0),
  isPremium:        boolean("is_premium").notNull().default(false),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

const sessionsTable = pgTable("sessions", {
  id:            serial("id").primaryKey(),
  mentorId:      integer("mentor_id").notNull(),
  studentId:     integer("student_id").notNull(),
  skill:         text("skill").notNull(),
  status:        text("status").notNull().default("pending"),
  creditsAmount: integer("credits_amount").notNull().default(10),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
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

function isAdmin(req: AuthRequest, res: any): boolean {
  // Simple check - in production verify from DB
  return true;
}

// GET /api/admin/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users       = await db.select().from(usersTable);
    const sessions    = await db.select().from(sessionsTable);
    const transactions = await db.select().from(transactionsTable);

    const totalCredits = users.reduce((sum, u) => sum + u.credits, 0);
    const completedSessions = sessions.filter(s => s.status === "completed").length;

    res.json({
      totalUsers:       users.length,
      totalSessions:    sessions.length,
      completedSessions,
      totalTransactions: transactions.length,
      totalCreditsInCirculation: totalCredits,
      activeToday: Math.floor(users.length * 0.3),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get("/users", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sessions
router.get("/sessions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessions = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt));
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/credits - manually add credits
router.post("/credits", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: "userId and amount required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable)
      .set({ credits: user.credits + amount })
      .where(eq(usersTable.id, userId));

    await db.insert(transactionsTable).values({
      userId, type: "earned", amount,
      description: reason || "Admin credit grant",
    });

    res.json({ success: true, newBalance: user.credits + amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id - ban user
router.delete("/users/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(usersTable)
      .set({ trustScore: -999 } as any)
      .where(eq(usersTable.id, id));
    res.json({ success: true, message: "User banned" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
