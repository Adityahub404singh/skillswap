import { Router } from "express";
import { db } from "../db.js";
import { usersTable, transactionsTable } from "../schema/index.js";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET DAILY STATS
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysActivity = await db.select().from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, userId),
                    gte(transactionsTable.createdAt, today),
                    inArray(transactionsTable.type, ['quiz_reward', 'quiz_penalty', 'quiz_warning'])
                )
            );
        
        const attempts = todaysActivity.length;
        const earned = todaysActivity.filter(t => t.type === 'quiz_reward').length * 2;
        
        res.json({ attempts, maxAttempts: 10, earned });
    } catch (err: any) { res.status(500).json({ error: "Failed to load stats" }); }
});

// SUBMIT ANSWER LOGIC
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { isCorrect } = req.body;
        const userId = req.userId!;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch Today's History
        const todaysActivity = await db.select().from(transactionsTable)
            .where(
                and(
                    eq(transactionsTable.userId, userId),
                    gte(transactionsTable.createdAt, today),
                    inArray(transactionsTable.type, ['quiz_reward', 'quiz_penalty', 'quiz_warning'])
                )
            );

        if (todaysActivity.length >= 10) {
            return res.status(400).json({ error: "Daily limit of 10 questions reached. Come back tomorrow!" });
        }

        if (isCorrect) {
            // CORRECT: +2 Credits
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 2` }).where(eq(usersTable.id, userId));
            await db.insert(transactionsTable).values({
                userId, type: "quiz_reward", amount: 2, description: "Daily Quiz (+2 Credits)"
            });
            return res.json({ success: true, status: "reward", message: "Correct! +2 Credits ⚡" });
        } else {
            // WRONG: Check for warnings
            const warningsToday = todaysActivity.filter(t => t.type === "quiz_warning").length;
            
            if (warningsToday === 0) {
                // FIRST TIME WRONG -> WARNING (No deduction)
                await db.insert(transactionsTable).values({
                    userId, type: "quiz_warning", amount: 0, description: "Quiz Warning (Wrong Answer)"
                });
                return res.json({ success: true, status: "warning", message: "Wrong Answer! ⚠️ First warning, no credits deducted." });
            } else {
                // SECOND TIME+ WRONG -> PENALTY (-2 Credits)
                await db.update(usersTable).set({ credits: sql`GREATEST(${usersTable.credits} - 2, 0)` }).where(eq(usersTable.id, userId));
                await db.insert(transactionsTable).values({
                    userId, type: "quiz_penalty", amount: -2, description: "Quiz Penalty (-2 Credits)"
                });
                return res.json({ success: true, status: "penalty", message: "Wrong again! ❌ -2 Credits deducted." });
            }
        }
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

export default router;
