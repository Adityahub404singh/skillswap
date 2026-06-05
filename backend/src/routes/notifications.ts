import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
// GET /api/notifications
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { notificationsTable } = await import("../schema.js");
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(desc(notificationsTable.createdAt));
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { notificationsTable } = await import("../schema.js");
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.userId!));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const notificationsRouter = router;

// ─── FEED ──────────────────────────────────────────────────────────────────
const feedRouter: IRouter = Router();

// GET /api/feed
feedRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const { feedPostsTable } = await import("../schema.js");
    const posts = await db.select().from(feedPostsTable).orderBy(desc(feedPostsTable.createdAt));
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feed
const PostSchema = z.object({
  type:    z.enum(["offering", "seeking", "achievement", "completed"]),
  content: z.string().min(5).max(500),
  skills:  z.array(z.string()).default([]),
});

feedRouter.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { feedPostsTable } = await import("../schema.js");
    const data = PostSchema.parse(req.body);
    const [post] = await db.insert(feedPostsTable).values({
      userId:  req.userId!,
      type:    data.type,
      content: data.content,
      skills:  data.skills,
    } as any).returning();
    res.status(201).json(post);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/feed/:id/like
feedRouter.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const { feedPostsTable } = await import("../schema.js");
    const id = parseInt(req.params.id);
    const [post] = await db.select().from(feedPostsTable).where(eq(feedPostsTable.id, id));
    if (!post) return res.status(404).json({ error: "Post not found" });
    await db.update(feedPostsTable).set({ likes: post.likes + 1 } as any).where(eq(feedPostsTable.id, id));
    res.json({ likes: post.likes + 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { feedRouter };
