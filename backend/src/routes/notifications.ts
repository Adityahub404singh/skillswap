import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
// 🔥 Duplicate table removed, schema imported
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
// 🔥 SECURITY FIX: Previously any logged-in user could pass an arbitrary
// `userId` and inject a notification into ANOTHER user's inbox (fake "payment
// received", phishing-style messages, etc). System-generated notifications
// (session booked, payment success, etc.) already go through notify.ts
// server-side and don't need this public endpoint. This route is now
// restricted to self-notifications only (e.g. a personal reminder feature).
// If you need server-to-user notifications, call notify.ts directly from
// backend code — never trust a client-supplied userId here.
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

export default router;