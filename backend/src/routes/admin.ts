
// 🔥 Auto-Fixed by Script
import { usersTable, sessionsTable, notificationsTable, swipesTable, transactionsTable, feedbacksTable } from "../schema/index.js";
﻿import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { pgTable, serial, integer, text, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { desc, eq, sql } from "drizzle-orm";

/* const usersTable = pgTable("users", {
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
}); */

/* const sessionsTable = pgTable("sessions", {
  id:              serial("id").primaryKey(),
  mentorId:        integer("mentor_id").notNull(),
  studentId:       integer("student_id").notNull(),
  skill:           text("skill").notNull(),
  status:          text("status").notNull().default("requested"),
  creditsAmount:   integer("credits_amount").notNull().default(10),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  cancelReason:    text("cancel_reason"),
}); */

/* const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  amount:      integer("amount").notNull(),
  type:        text("type").notNull(),
  description: text("description").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
}); */

const router: IRouter = Router();

// GET /api/admin/stats
// GET /api/admin/stats
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const sessions = await db.select().from(sessionsTable);
    const txs = await db.select().from(transactionsTable);

    // Calculate 15% from all completed sessions
    const completed = sessions.filter(s => s.status === "completed");
    const sessionRevenue = completed.reduce((sum, s) => sum + Math.round(s.creditsAmount * 0.15), 0);
    
    // Calculate 20% from all withdrawals
    const withdrawals = txs.filter(t => t.type === "withdrawal_pending" || t.type === "withdrawal_completed" || t.type === "withdrawal_complete");
    const withdrawalRevenue = withdrawals.reduce((sum, t) => sum + Math.round(Math.abs(t.amount) * 0.20), 0);

    res.json({
      totalUsers: users.length,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalCreditsInSystem: users.reduce((sum, u) => sum + u.credits, 0),
      platformRevenue: sessionRevenue + withdrawalRevenue, // 💰 TOTAL PROFIT
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
      await db.update(usersTable).set({ isPremium } as any).where(eq(usersTable.id, userId));
      res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ✅ APPROVE WITHDRAWAL ROUTE
router.post("/transactions/:id/approve", requireAuth, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
        
        if (!tx || tx.type !== "withdrawal_pending") {
            return res.status(400).json({ error: "Invalid or already processed transaction" });
        }

        // Update status to completed
        await db.update(transactionsTable)
            .set({ type: "withdrawal_completed", description: tx.description + " (Approved)" })
            .where(eq(transactionsTable.id, txId));

        res.json({ success: true, message: "Withdrawal approved" });
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// ❌ REJECT WITHDRAWAL & REFUND ROUTE
router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
        if (!tx || tx.type !== "withdrawal_pending") return res.status(400).json({ error: "Invalid transaction" });

        const refundAmount = Math.abs(tx.amount);
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundAmount}` }).where(eq(usersTable.id, tx.userId));
        await db.update(transactionsTable).set({ type: "withdrawal_rejected", description: tx.description + " (REJECTED & REFUNDED)" }).where(eq(transactionsTable.id, txId));
        res.json({ success: true, message: "Withdrawal rejected" });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

// ⚖️ RESOLVE DISPUTE / FORCE CANCEL SESSION
router.post("/sessions/:id/resolve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const sessionId = parseInt(req.params.id as string);
        const { action } = req.body; 
        const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
        if (!session) return res.status(404).json({ error: "Session not found" });

        if (action === "refund_student") {
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
            await db.insert(transactionsTable).values({ userId: session.studentId, type: "refund", amount: session.creditsAmount, description: `Admin Refund for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "cancelled", cancelReason: "Admin force cancelled & refunded." }).where(eq(sessionsTable.id, sessionId));
        } else if (action === "pay_mentor") {
            const platformFee = Math.round(session.creditsAmount * 0.15);
            const mentorEarnings = session.creditsAmount - platformFee;
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarnings}` }).where(eq(usersTable.id, session.mentorId));
            await db.insert(transactionsTable).values({ userId: session.mentorId, type: "earned", amount: mentorEarnings, description: `Admin forced payment for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "completed", cancelReason: "Admin forced payment to mentor." }).where(eq(sessionsTable.id, sessionId));
        }
        res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

export default router;



