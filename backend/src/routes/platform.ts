import { Router } from "express";
import { db } from "../db.js";
import { feedbacksTable, subscribersTable } from "../schema/index.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { desc } from "drizzle-orm";

const router = Router();

// 1. Newsletter Subscription API
router.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        // Basic check if email exists to avoid 500 error on duplicate
        const existing = await db.select().from(subscribersTable).where(
          (table) => table.email === email
        ).catch(() => []); // Ignore errors if not strictly enforced yet
        
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
        const userId = req.userId; // Will be undefined if not logged in (which is fine)
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
        // Simple fetch for now, you can add user details mapping later if needed
        const feedbacks = await db.select().from(feedbacksTable).orderBy(desc(feedbacksTable.createdAt));
        res.json(feedbacks);
    } catch (err) { res.status(500).json({ error: "Failed to fetch feedbacks" }); }
});

// 4. ADMIN: Get All Subscribers
router.get("/admin/subscribers", requireAuth, async (req, res) => {
    try {
        const subs = await db.select().from(subscribersTable).orderBy(desc(subscribersTable.createdAt));
        res.json(subs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch subscribers" }); }
});

export default router;
