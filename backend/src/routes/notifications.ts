import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
// ðŸ”¥ Duplicate table removed, schema imported
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
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false });
  }
});

// POST /api/notifications
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, type, title, message, actionUrl } = z.object({
      userId:    z.number(),
      type:      z.string(),
      title:     z.string(),
      message:   z.string(),
      actionUrl: z.string().optional(),
    }).parse(req.body);

    const [notif] = await db.insert(notificationsTable).values({
      userId, type, title, message, actionUrl: actionUrl ?? null,
    }).returning();
    res.status(201).json(notif);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
