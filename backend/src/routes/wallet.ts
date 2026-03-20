import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "../db.js";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: "Not Found", message: "User not found" });
      return;
    }

    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));

    const totalEarned = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

    res.json({
      balance: user.credits,
      userId,
      totalEarned,
      totalSpent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const transactions = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
