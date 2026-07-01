import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { transactionsTable, usersTable } from "../schema/index.js"; 

const router: IRouter = Router();

// 1. FETCH WALLET STATS
router.get("/", requireAuth, async (req: AuthRequest, res) => {
    try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!user) return res.status(404).json({ error: "User not found" });

        const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, req.userId!));

        const totalEarned = transactions
            .filter(tx => tx.type === "earned")
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalSpent = transactions
            .filter(tx => tx.type === "spent" || tx.type === "withdrawal_pending" || tx.amount < 0)
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

        res.json({
            balance: user.credits,
            totalEarned,
            totalSpent
        });
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// 2. FETCH TRANSACTION HISTORY (🔥 EXPERT FIX: Added LIMIT 100 to prevent bandwidth leak)
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
        const history = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, req.userId!))
            .orderBy(desc(transactionsTable.createdAt))
            .limit(100);
        res.json(history);
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// 3. 🔒 BULLETPROOF WITHDRAWAL LOGIC
router.post("/withdraw", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { amount, upiId } = req.body;
        
        if (!amount || amount < 500) return res.status(400).json({ error: "Minimum withdrawal is 500 credits." });
        if (!upiId) return res.status(400).json({ error: "UPI ID is required." });

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (user.credits < amount) return res.status(400).json({ error: "Insufficient balance." });

        // 🔥 FRAUD FIX: Check "Unmatured" credits instead of all-time matured
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const recentEarnedTx = await db.select().from(transactionsTable)
            .where(sql`${transactionsTable.userId} = ${req.userId} AND ${transactionsTable.type} = 'earned'`);
        
        // Calculate credits earned in the last 7 days (These are locked)
        const unmaturedCredits = recentEarnedTx
            .filter(tx => (now - new Date(tx.createdAt).getTime()) < SEVEN_DAYS_MS)
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // Max amount user can actually withdraw right now
        const withdrawableBalance = Math.max(0, user.credits - unmaturedCredits);
        
        if (amount > withdrawableBalance) {
            return res.status(403).json({ 
                error: `Credits take 7 days to clear. Your withdrawable balance is only ${withdrawableBalance} cr.` 
            });
        }

        // 💸 15% WITHDRAWAL CUT LOGIC (Platform Profit)
        const platformCut = Math.round(amount * 0.15);
        const finalPayout = amount - platformCut;

        // 🔥 ATOMIC TRANSACTION: Ensuring DB doesn't deduct money if transaction log fails
        await db.transaction(async (tx) => {
            // 1. Deduct full amount from user wallet
            await tx.update(usersTable)
              .set({ credits: sql`${usersTable.credits} - ${amount}` })
              .where(eq(usersTable.id, req.userId!));
            
            // 2. Save transaction with 15% fee details
            await tx.insert(transactionsTable).values({
                userId: req.userId!, 
                type: "withdrawal_pending", 
                amount: -amount,
                description: `Payout: Rs ${finalPayout} (15% fee: ${platformCut} cr). UPI: ${upiId}`
            });
        });

        res.json({ success: true, message: `Withdrawal requested! Rs ${finalPayout} will be credited to your UPI within 24-48 hours.` });
    } catch (err: any) {
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

export default router;
