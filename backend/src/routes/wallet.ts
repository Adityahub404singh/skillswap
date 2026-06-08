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

// 2. FETCH TRANSACTION HISTORY
router.get("/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
        const history = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.userId, req.userId!))
            .orderBy(desc(transactionsTable.createdAt));
        res.json(history);
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// 3. SECURE WITHDRAWAL LOGIC (With 7-Day Maturity Hold)
router.post("/withdraw", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { amount, upiId } = req.body;
        
        if (!amount || amount < 500) return res.status(400).json({ error: "Minimum withdrawal is 500 credits." });
        if (!upiId) return res.status(400).json({ error: "UPI ID is required." });

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (user.credits < amount) return res.status(400).json({ error: "Insufficient balance." });

        // 🚨 FRAUD FIX: Fetch only "Earned" credits
        const earnedTx = await db.select().from(transactionsTable)
            .where(sql`${transactionsTable.userId} = ${req.userId} AND ${transactionsTable.type} = 'earned'`);
        
        // 🚨 FRAUD FIX 2: 7-Day Maturity Lock added here
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const maturedEarned = earnedTx
            .filter(tx => (now - new Date(tx.createdAt).getTime()) >= SEVEN_DAYS_MS)
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        if (maturedEarned < amount) {
            return res.status(403).json({ 
                error: `Credits take 7 days to clear. Your matured withdrawable balance is only ${maturedEarned} cr.` 
            });
        }

        // Deduct from user wallet
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${amount}` }).where(eq(usersTable.id, req.userId!));
        
        // Save UPI ID in description so Admin knows where to send money
        await db.insert(transactionsTable).values({
            userId: req.userId!, 
            type: "withdrawal_pending", 
            amount: -amount,
            description: `Withdrawal pending to UPI: ${upiId}`,
        });

        res.json({ success: true, message: "Withdrawal requested successfully!" });
    } catch (err: any) {
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

export default router;