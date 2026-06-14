import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm"; // 🔥 Raw SQL Drizzle import

const router = Router();

// 💬 POST: Naya message bhejo (["/", ""] dono lagaye taaki routing fail na ho)
router.post(["/", ""], async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
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
// Add this inside backend/src/index.ts ke andar, baaki routes ke neeche:
router.get("/conversations", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
        // Fetch users who have chatted with me
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
// 💬 GET: Puraani Chat History nikaalo
router.get("/:otherUserId", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
        const otherUserId = parseInt(req.params.otherUserId);

        const chatHistoryResult = await db.execute(sql`
            SELECT * FROM messages 
            WHERE (sender_id = ${userId} AND receiver_id = ${otherUserId})
               OR (sender_id = ${otherUserId} AND receiver_id = ${userId})
            ORDER BY created_at ASC
        `);

        res.json(chatHistoryResult.rows || chatHistoryResult);
    } catch (error) {
        console.error("Chat fetch error:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});


export default router;