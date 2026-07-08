import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm"; 
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; 

const router = Router();

// 💬 POST: Naya message bhejo
router.post(["/", ""], requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
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

// 👥 GET: Conversations List (🔥 THE ULTIMATE FIX FOR DUPLICATES)
router.get("/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        
        // 1. Saare messages uthao jisme ye user involved hai (Latest first)
        const convos = await db.execute(sql`
            SELECT u.id, u.name, u.avatar, m.content as lastMessage, m.created_at
            FROM users u
            JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE (m.sender_id = ${userId} OR m.receiver_id = ${userId})
            AND u.id != ${userId}
            ORDER BY m.created_at DESC
        `);

        // Database drivers return data differently (rows ya direct array)
        const rawRows = convos.rows || convos;
        
        // 2. FOOLPROOF JAVASCRIPT DEDUPLICATION (Ek user sirf 1 baar)
        const uniqueChatsMap = new Map();

        for (const row of rawRows as any[]) {
            // Map mein sirf pehli entry save hogi (aur kyunki ORDER BY DESC hai, pehli entry hamesha latest hogi)
            if (!uniqueChatsMap.has(row.id)) {
                uniqueChatsMap.set(row.id, row);
            }
        }

        // 3. Map wapas Array mein convert karke frontend ko bhej do
        const uniqueChats = Array.from(uniqueChatsMap.values());

        res.json(uniqueChats);
    } catch (e) {
        console.error("Conversations fetch error:", e);
        res.status(500).json({ error: "Failed to load chats" });
    }
});

// 💬 GET: Puraani Chat History nikaalo
router.get("/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const otherUserId = parseInt(req.params.otherUserId as string);

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

// 🗑️ DELETE: Poori Chat Delete karne ka route (Tere pichle request ke liye)
router.delete("/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const otherUserId = parseInt(req.params.otherUserId as string);

        await db.execute(sql`
            DELETE FROM messages 
            WHERE (sender_id = ${userId} AND receiver_id = ${otherUserId})
               OR (sender_id = ${otherUserId} AND receiver_id = ${userId})
        `);

        res.json({ success: true, message: "Chat deleted permanently" });
    } catch (error) {
        console.error("Delete chat error:", error);
        res.status(500).json({ error: "Failed to delete chat" });
    }
});

export default router;