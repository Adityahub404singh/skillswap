import { Router } from "express";
import type { Pool } from "pg";
import { z } from "zod";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";

const uuidSchema = z.string().uuid();
const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export function messagesRouter(pool: Pool) {
  const router = Router();
  router.use(requireConnectUser);

  // GET /conversations/:conversationId/messages
  router.get("/:conversationId/messages", async (req: ConnectRequest, res, next) => {
    try {
      const conversationId = uuidSchema.parse(req.params.conversationId);
      const userId = req.connectUser!.id;
      const membership = await pool.query(
        `SELECT 1
           FROM connect_conversation_members
          WHERE conversation_id = $1 AND member_user_id = $2
          LIMIT 1`,
        [conversationId, userId],
      );
      if (!membership.rowCount) {
        return res.status(403).json({ success: false, message: "Conversation access denied" });
      }

      // Mark incoming messages as read before returning the thread.
      await pool.query(
        `UPDATE connect_messages
            SET read_at = COALESCE(read_at, NOW())
          WHERE conversation_id = $1
            AND sender_user_id <> $2
            AND read_at IS NULL`,
        [conversationId, userId],
      );

      const result = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_user_id, m.body, m.created_at,
                m.read_at, u.name AS sender_name
           FROM connect_messages m
           LEFT JOIN users u ON u.id = m.sender_user_id
          WHERE m.conversation_id = $1
          ORDER BY m.created_at ASC
          LIMIT 300`,
        [conversationId],
      );
      res.set("Cache-Control", "private, no-store").json({ items: result.rows });
    } catch (error) {
      next(error);
    }
  });

  // POST /conversations/:conversationId/messages
  router.post("/:conversationId/messages", async (req: ConnectRequest, res, next) => {
    try {
      const conversationId = uuidSchema.parse(req.params.conversationId);
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: "Invalid message", issues: parsed.error.issues });
      }

      const userId = req.connectUser!.id;
      const membership = await pool.query(
        `SELECT 1
           FROM connect_conversation_members
          WHERE conversation_id = $1 AND member_user_id = $2
          LIMIT 1`,
        [conversationId, userId],
      );
      if (!membership.rowCount) {
        return res.status(403).json({ success: false, message: "Conversation access denied" });
      }

      const result = await pool.query(
        `INSERT INTO connect_messages (conversation_id, sender_user_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, sender_user_id, body, created_at, read_at`,
        [conversationId, userId, parsed.data.body],
      );
      res.status(201).json({ message: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
