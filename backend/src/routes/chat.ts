import { Router } from "express";
import { db } from "../db.js";
import { messages } from "../schema/swipes.js"; // Kyunki humne messages aur swipes ek hi file me banaye the
import { eq, or, and, asc } from "drizzle-orm";

const router = Router();

// 💬 GET: Puraani Chat History nikaalo
router.get("/:otherUserId", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1; // Dummy user ID for testing
        const otherUserId = parseInt(req.params.otherUserId);

        const chatHistory = await db
            .select()
            .from(messages)
            .where(
                or(
                    and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
                    and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
                )
            )
            .orderBy(asc(messages.createdAt));

        res.json(chatHistory);
    } catch (error) {
        console.error("Chat fetch error:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// 💬 POST: Naya message bhejo
router.post("/", async (req: any, res) => {
    try {
        const userId = req.user?.id || 1;
        const { receiverId, content } = req.body;

        await db.insert(messages).values({
            senderId: userId,
            receiverId: receiverId,
            content: content,
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Message send error:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;