import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notificationsTable } from "../schema/index.js";

const router: IRouter = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifs = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(desc(notificationsTable.createdAt)).limit(50);
    res.json(notifs);
  } catch (err: any) {
    console.error("[notifications fallback]", err.message);
    res.json([]); 
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.userId!));
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: "Database not ready" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const result = await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)))
      .returning({ id: notificationsTable.id });

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false });
  }
});

// POST /api/notifications
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, title, message, actionUrl } = z.object({
      type:      z.string(),
      title:     z.string(),
      message:   z.string(),
      actionUrl: z.string().optional(),
    }).parse(req.body);

    const [notif] = await db.insert(notificationsTable).values({
      userId: req.userId!, type, title, message, actionUrl: actionUrl ?? null,
    }).returning();
    res.status(201).json(notif);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 🔥 FIX: Naya DELETE route add kiya taki notification permanently hategi
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, error: "Failed to delete" });
  }
});

export default router;