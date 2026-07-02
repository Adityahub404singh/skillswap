import { Router } from "express";
import { db } from "../db.js";
import { feedbacksTable, subscribersTable } from "../schema/index.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { desc, eq } from "drizzle-orm"; // 🔥 FIX: Imported eq here

const router = Router();

// 1. Newsletter Subscription API
router.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        // 🔥 FIX: Correct Drizzle syntax used here
        const existing = await db.select().from(subscribersTable).where(
          eq(subscribersTable.email, email) 
        ).catch(() => []); 
        
        if (existing && existing.length === 0) {
            await db.insert(subscribersTable).values({ email });
        }
        res.json({ success: true, message: "Subscribed successfully" });
    } catch (err) {
        console.error("Subscription Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. Platform Feedback API
router.post("/feedback", async (req: AuthRequest, res) => {
    try {
        const { rating, text } = req.body;
        const userId = req.userId;
        await db.insert(feedbacksTable).values({
            userId,
            rating,
            text
        });
        res.json({ success: true, message: "Feedback received" });
    } catch (err) {
        console.error("Feedback Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. ADMIN: Get All Feedbacks
router.get("/admin/feedbacks", requireAuth, async (req, res) => {
    try {
        const feedbacks = await db.select().from(feedbacksTable).orderBy(desc(feedbacksTable.createdAt)).limit(100);
        res.json(feedbacks);
    } catch (err) { res.status(500).json({ error: "Failed to fetch feedbacks" }); }
});

// 4. ADMIN: Get All Subscribers
router.get("/admin/subscribers", requireAuth, async (req, res) => {
    try {
        const subs = await db.select().from(subscribersTable).orderBy(desc(subscribersTable.createdAt)).limit(500);
        res.json(subs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch subscribers" }); }
});

export default router;