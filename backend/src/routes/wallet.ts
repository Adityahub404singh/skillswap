import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { pgTable, serial, integer, text, timestamp, boolean, real } from "drizzle-orm/pg-core";

// --- Schema Definitions ---
const usersTable = pgTable("users", {
  id:                 serial("id").primaryKey(),
  name:               text("name").notNull(),
  email:              text("email").notNull(),
  passwordHash:       text("password_hash").notNull(),
  credits:            integer("credits").notNull().default(50),
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

const router: IRouter = Router();

// GET /api/wallet (Fetch Balance & Stats)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) return res.status(404).json({ error: "User not found" });

    const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, req.userId!));

    let totalEarned = 0;
    let totalSpent = 0;
    
    txs.forEach(tx => {
      // Calculate earnings (teaching, bonus, referral)
      if (tx.type === "earned" || tx.type === "bonus" || tx.type === "referral") {
        totalEarned += tx.amount;
      }
      // Calculate spendings (booking sessions, withdrawals)
      if (tx.type === "spent" || tx.type === "withdrawal") {
        totalSpent += Math.abs(tx.amount);
      }
    });

    res.json({
      balance: user.credits,
      totalEarned,
      totalSpent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/transactions (Fetch History)
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const txs = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!))
      .orderBy(desc(transactionsTable.createdAt));
      
    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/withdraw (Highly Secure Withdrawal Request)
router.post("/withdraw", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, upiId } = req.body;
    
    // 1. Basic Validation
    if (!amount || amount < 500) {
      return res.status(400).json({ error: "Minimum withdrawal amount is 500 credits." });
    }
    if (!upiId || upiId.length < 5 || !upiId.includes("@")) {
      return res.status(400).json({ error: "Invalid UPI ID provided." });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Strict Balance Check
    if (user.credits < amount) {
      return res.status(400).json({ error: "Insufficient balance for this withdrawal." });
    }

    // 3. Atomic DB Transaction (Deduct balance & Record History)
    await db.transaction(async (tx) => {
      // Deduct from wallet
      await tx.update(usersTable)
        .set({ credits: sql`${usersTable.credits} - ${amount}` })
        .where(eq(usersTable.id, req.userId!));

      // Record in transactions (This acts as the Pending Queue for Admin)
      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "withdrawal",
        amount: -Math.abs(amount), // Save as negative for record keeping
        description: `Withdrawal Requested (UPI: ${upiId})`
      });
    });

    res.json({ success: true, message: `Withdrawal of ${amount} cr requested successfully!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
