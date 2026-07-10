import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm"; 
import { requireAuth, type AuthRequest } from "../middlewares/auth.js"; 
import { notify } from "../notify.js";

const router = Router();

// 💬 POST: Naya message bhejo (🔥 Optimized & TypeScript Fixed)
router.post(["/", ""], requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { receiverId, content } = req.body;

        // Validation
        if (!receiverId || !content || content.trim() === "") {
            return res.status(400).json({ error: "Receiver ID and Content are required" });
        }

        // 1. Message save karo aur TURANT return mango (RETURNING *)
        const insertRes = await db.execute(sql`
            INSERT INTO messages (sender_id, receiver_id, content) 
            VALUES (${userId}, ${receiverId}, ${content.trim()})
            RETURNING *
        `);
        
        // Safely extract the new message
        const rawResult = insertRes.rows || insertRes;
        const newMessage = Array.isArray(rawResult) ? rawResult[0] : null;

        // 2. Receiver ko notification bhejo ki naya message aaya hai
        const senderRes = await db.execute(sql`SELECT name FROM users WHERE id = ${userId}`);
        const senderData = senderRes.rows || senderRes;
        
        // 🔥 FIX: TypeScript ko saaf-saaf bata diya ki ye String hai
        const senderName = String(Array.isArray(senderData) && senderData[0] ? (senderData[0] as any).name : "Someone");
        
        // Background Notification (Number aur String strict types ke sath)
        notify.newMessage(Number(receiverId), senderName).catch(err => {
            console.error("Failed to send message notification in background:", err);
        });

        res.status(201).json({ success: true, message: "Message sent!", data: newMessage });
    } catch (error) {
        console.error("Message send error:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// 👥 GET: Conversations List
router.get("/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        
        const convos = await db.execute(sql`
            SELECT u.id, u.name, u.avatar, m.content as "lastMessage", m.created_at
            FROM users u
            JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE (m.sender_id = ${userId} OR m.receiver_id = ${userId})
            AND u.id != ${userId}
            ORDER BY m.created_at DESC
        `);

        const rawRows = convos.rows || convos;
        const uniqueChatsMap = new Map();

        if (Array.isArray(rawRows)) {
            for (const row of rawRows) {
                if (!uniqueChatsMap.has(row.id)) {
                    uniqueChatsMap.set(row.id, row);
                }
            }
        }

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

        if (isNaN(otherUserId)) {
            return res.status(400).json({ error: "Invalid User ID" });
        }

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

// 🗑️ DELETE: Poori Chat Delete karne ka route
router.delete("/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const otherUserId = parseInt(req.params.otherUserId as string);

        if (isNaN(otherUserId)) {
            return res.status(400).json({ error: "Invalid User ID" });
        }

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