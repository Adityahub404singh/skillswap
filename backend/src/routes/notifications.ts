import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notificationsTable } from "../schema/index.js";
// 🔥 NAYA FIX: notify.ts se 'createNotification' import kiya taaki Push Notification jaye
import { createNotification } from "../notify.js"; 

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

// 🔥 THE BIG FIX (POST /api/notifications)
// Ab ye route sirf In-App DB entry nahi banayega, balki Firebase (FCM) par Push Notification bhi bhejega!
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, title, message, actionUrl } = z.object({
      type:      z.string(),
      title:     z.string(),
      message:   z.string(),
      actionUrl: z.string().optional(),
    }).parse(req.body);

    // Ye 'createNotification' humara notify.ts ka function hai. 
    // Ye DB Entry + Email + Firebase Push teeno ek saath handle kar lega.
    await createNotification(req.userId!, type, title, message, actionUrl);
    
    res.status(201).json({ success: true, message: "Notification processed" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE route
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