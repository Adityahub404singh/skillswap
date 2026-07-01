import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm"; 
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; // 🔥 Security Added

const router = Router();

// 💬 POST: Naya message bhejo
router.post(["/", ""], requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!; // 🔥 FIX: Strictly secure
        const { receiverId, content } = req.body;

        await db.execute(sql`
            INSERT INTO messages (sender_id, receiver_id, content) 
            VALUES (${userId}, ${receiverId}, ${content})
        `);

        res.json({ success: true, message: "Message sent!" });
    } catch (error) {
        console.error("Message send error:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// GET: Conversations
router.get("/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!; // 🔥 FIX
        const convos = await db.execute(sql`
            SELECT DISTINCT u.id, u.name, u.avatar, m.content as lastMessage, m.created_at
            FROM users u
            JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE (m.sender_id = ${userId} OR m.receiver_id = ${userId})
            AND u.id != ${userId}
            ORDER BY m.created_at DESC
        `);
        res.json(convos.rows || convos);
    } catch (e) {
        res.status(500).json({ error: "Failed to load chats" });
    }
});

// 💬 GET: Puraani Chat History nikaalo (🔥 10X OPTIMIZED WITH LIMIT)
router.get("/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!; // 🔥 FIX
        const otherUserId = parseInt(req.params.otherUserId as string);

        // Subquery: Pehle latest 50 messages nikalo DESC mein, fir unko UI ke liye ASC mein palat do
        const chatHistoryResult = await db.execute(sql`
            SELECT * FROM (
                SELECT * FROM messages 
                WHERE (sender_id = ${userId} AND receiver_id = ${otherUserId})
                   OR (sender_id = ${otherUserId} AND receiver_id = ${userId})
                ORDER BY created_at DESC
                LIMIT 50
            ) sub
            ORDER BY created_at ASC
        `);

        res.json(chatHistoryResult.rows || chatHistoryResult);
    } catch (error) {
        console.error("Chat fetch error:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

export default router;
