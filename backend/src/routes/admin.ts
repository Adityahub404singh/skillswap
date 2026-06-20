import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { desc, eq, sql, or } from "drizzle-orm";
import { usersTable, sessionsTable, transactionsTable } from "../schema/index.js";

const router: IRouter = Router();

// GET /api/admin/stats
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const sessions = await db.select().from(sessionsTable);
    const txs = await db.select().from(transactionsTable);

    // 🔥 FIX: creditsAmount use kiya (Schema ke hisaab se)
    const completed = sessions.filter(s => s.status === "completed");
    const sessionRevenue = completed.reduce((sum, s) => sum + Math.round(s.creditsAmount * 0.15), 0);
    
    // 15% withdrawal fee logic
    const withdrawals = txs.filter(t => t.type === "withdrawal_pending" || t.type === "withdrawal_completed" || t.type === "withdrawal_complete");
    const withdrawalRevenue = withdrawals.reduce((sum, t) => sum + Math.round(Math.abs(t.amount) * 0.15), 0);

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

// GET /api/admin/pending-withdrawals
router.get("/pending-withdrawals", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pending = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.type, "withdrawal_pending"))
      .orderBy(desc(transactionsTable.createdAt));

    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// GET /api/admin/user/:id/history
router.get("/user/:id/history", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);

    // 🔥 FIX: mentorId aur studentId use kiya
    const [sessions, transactions] = await Promise.all([
      db.select().from(sessionsTable).where(or(eq(sessionsTable.mentorId, userId), eq(sessionsTable.studentId, userId))).orderBy(desc(sessionsTable.createdAt)),
      db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)),
    ]);

    res.json({ sessions, transactions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user history" });
  }
});

// POST /api/admin/users/:id/credits
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { amount, reason } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable).set({ credits: user.credits + amount }).where(eq(usersTable.id, userId));
    await db.insert(transactionsTable).values({
      userId, type: "bonus", amount,
      description: `Admin ID ${req.userId} ${amount >= 0 ? "added" : "deducted"} ${Math.abs(amount)} cr. Reason: ${reason || "Admin credit grant"}`,
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

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.update(usersTable).set({ trustScore: -999 } as any).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User banned" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/transactions/:id/complete
router.patch("/transactions/:id/complete", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        await db.update(transactionsTable)
            .set({
              type: "withdrawal_complete",
              description: sql`${transactionsTable.description} || ' - PAID (by Admin ${req.userId})'`,
            })
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

// APPROVE WITHDRAWAL ROUTE
router.post("/transactions/:id/approve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
        
        if (!tx || tx.type !== "withdrawal_pending") {
            return res.status(400).json({ error: "Invalid or already processed transaction" });
        }

        await db.update(transactionsTable)
            .set({ type: "withdrawal_completed", description: `${tx.description} (Approved by Admin ID ${req.userId})` })
            .where(eq(transactionsTable.id, txId));

        res.json({ success: true, message: "Withdrawal approved" });
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// REJECT WITHDRAWAL & REFUND ROUTE
router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
        if (!tx || tx.type !== "withdrawal_pending") return res.status(400).json({ error: "Invalid transaction" });

        const refundAmount = Math.abs(tx.amount);
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundAmount}` }).where(eq(usersTable.id, tx.userId));
        await db.update(transactionsTable).set({ type: "withdrawal_rejected", description: `${tx.description} (REJECTED & REFUNDED by Admin ID ${req.userId})` }).where(eq(transactionsTable.id, txId));
        res.json({ success: true, message: "Withdrawal rejected" });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

// RESOLVE DISPUTE / FORCE CANCEL SESSION
router.post("/sessions/:id/resolve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const sessionId = parseInt(req.params.id as string);
        const { action } = req.body; 
        const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
        if (!session) return res.status(404).json({ error: "Session not found" });

        if (action === "refund_student") {
            // 🔥 FIX: studentId aur creditsAmount use kiya
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
            await db.insert(transactionsTable).values({ userId: session.studentId, type: "refund", amount: session.creditsAmount, description: `Admin ID ${req.userId} Refund for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "cancelled", cancelReason: "Admin force cancelled & refunded." }).where(eq(sessionsTable.id, sessionId));
        } else if (action === "pay_mentor") {
            // 🔥 FIX: mentorId aur creditsAmount use kiya
            const platformFee = Math.round(session.creditsAmount * 0.15);
            const mentorEarnings = session.creditsAmount - platformFee;
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarnings}` }).where(eq(usersTable.id, session.mentorId));
            await db.insert(transactionsTable).values({ userId: session.mentorId, type: "earned", amount: mentorEarnings, description: `Admin ID ${req.userId} forced payment for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "completed", cancelReason: "Admin forced payment to mentor." }).where(eq(sessionsTable.id, sessionId));
        }
        res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

export default router;