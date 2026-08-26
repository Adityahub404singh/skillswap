import { Router, type IRouter, type Response } from "express";
import { db } from "../db.js";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { transactionsTable, usersTable } from "../schema/index.js"; 

const router: IRouter = Router();

// 1. FETCH WALLET STATS
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!user) return res.status(404).json({ error: "User not found" });

        const result = await db.execute(sql`SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE 0 END), 0) as total_earned, COALESCE(SUM(CASE WHEN type IN ('spent', 'withdrawal_pending') OR amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent FROM transactions WHERE user_id = ${req.userId}`);
        const stats = result.rows[0] as any;
        const totalEarned = Number(stats?.total_earned || 0);
        const totalSpent = Number(stats?.total_spent || 0);

        return res.json({
            balance: user.credits,
            totalEarned,
            totalSpent
        });
    } catch (err: any) {
        return res.status(500).json({ error: "Server error" });
    }
});

// 2. FETCH TRANSACTION HISTORY
router.get("/transactions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const history = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, req.userId!))
            .orderBy(desc(transactionsTable.createdAt))
            .limit(100);
            
        return res.json(history);
    } catch (err: any) {
        return res.status(500).json({ error: "Server error" });
    }
});

// 3. 🛡️ BULLETPROOF WITHDRAWAL LOGIC
router.post("/withdraw", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { amount, upiId } = req.body;
        
        // 🔥 BACKEND VALIDATION: STRICT 500 CREDITS MINIMUM RULE
        if (!amount || amount < 500) {
            return res.status(400).json({ error: "Minimum withdrawal is 500 credits." });
        }
        
        if (!upiId) return res.status(400).json({ error: "UPI ID is required." });

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!user) return res.status(404).json({ error: "User not found." });
        if (user.credits < amount) return res.status(400).json({ error: "Insufficient balance." });

        // 🔥 7-DAY CLEARANCE CHECK
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const recentEarnedResult = await db.execute(sql`
            SELECT COALESCE(SUM(amount), 0) as unmatured_credits 
            FROM transactions 
            WHERE user_id = ${req.userId} 
            AND type = 'earned' 
            AND created_at >= ${sevenDaysAgo.toISOString()}
        `);
        
        const unmaturedCredits = Number(recentEarnedResult.rows[0]?.unmatured_credits || 0);
        const withdrawableBalance = Math.max(0, user.credits - unmaturedCredits);
        
        if (amount > withdrawableBalance) {
            return res.status(403).json({ 
                error: `Credits take 7 days to clear. Your withdrawable balance is only ${withdrawableBalance} cr.` 
            });
        }

        // 🔥 15% WITHDRAWAL CUT (Platform Profit)
        const platformCut = Math.round(amount * 0.15);
        const finalPayout = amount - platformCut; // 1 credit = 1 rupee payout

        // ✅ ATOMIC DEDUCTION (Race condition proof)
        const result = await db.transaction(async (tx) => {
            const updated = await tx.update(usersTable)
              .set({ credits: sql`${usersTable.credits} - ${amount}` })
              .where(and(eq(usersTable.id, req.userId!), sql`${usersTable.credits} >= ${amount}`))
              .returning({ credits: usersTable.credits });

            if (updated.length === 0) {
                throw new Error("INSUFFICIENT_BALANCE_RACE");
            }

            await tx.insert(transactionsTable).values({
                userId: req.userId!,
                type: "withdrawal_pending",
                amount: -amount,
                description: `Payout: Rs ${finalPayout} (15% fee: ${platformCut} cr). UPI: ${upiId}`,
                createdAt: new Date(),
            });

            return updated[0];
        });

        return res.json({ success: true, message: `Withdrawal requested! Rs ${finalPayout} will be credited to your UPI within 24-48 hours.` });
    } catch (err: any) {
        if (err.message === "INSUFFICIENT_BALANCE_RACE") {
            return res.status(400).json({ error: "Insufficient balance. Please refresh and try again." });
        }
        return res.status(500).json({ error: "Server error. Please try again." });
    }
});

export default router;