import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { usersTable } from "../schema/users.js";
import { sessionsTable } from "../schema/sessions.js";
import { transactionsTable } from "../schema/transactions.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

// GET stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable);
    const sessions = await db.select().from(sessionsTable);
    const transactions = await db.select().from(transactionsTable);

    const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
    const recentUsers = [...users].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);

    res.json({
      totalUsers: users.length,
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === "completed").length,
      totalCreditsInSystem: totalCredits,
      recentUsers: recentUsers.map(u => ({ id: u.id, name: u.name, email: u.email, credits: u.credits })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// GET all users
router.get("/users", requireAuth, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, credits: u.credits, trustScore: u.trustScore, sessionsCompleted: u.sessionsCompleted, createdAt: u.createdAt })));
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// POST add/remove credits
router.post("/users/:userId/credits", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId as string);
    const { amount, reason } = req.body;
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${amount}` }).where(eq(usersTable.id, userId));
    await db.insert(transactionsTable).values({ userId, amount, type: amount > 0 ? "earned" : "spent", description: reason || "Admin adjustment" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// DELETE user
router.delete("/users/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId as string);
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// GET all sessions
router.get("/sessions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessions = await db.select().from(sessionsTable);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// PATCH cancel session
router.patch("/sessions/:sessionId/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// GET all transactions
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const transactions = await db.select().from(transactionsTable);
    res.json(transactions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

export default router;