import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { eq, or, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

const SESSION_CONFIG: Record<string, { duration: number; credits: number; label: string }> = {
  micro_15: { duration: 15, credits: 3,  label: "15-min Quick Session" },
  micro_30: { duration: 30, credits: 5,  label: "30-min Session" },
  doubt:    { duration: 20, credits: 4,  label: "Doubt Solving" },
  standard: { duration: 60, credits: 10, label: "1-hour Session" },
  extended: { duration: 90, credits: 15, label: "1.5-hour Deep Dive" },
};

// GET /api/sessions/types
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// GET /api/sessions
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionsTable } = await import("../schema.js");
    const rows = await db.select().from(sessionsTable)
      .where(or(eq(sessionsTable.teacherId, req.userId!), eq(sessionsTable.learnerId, req.userId!)))
      .orderBy(desc(sessionsTable.scheduledAt));
    res.json(rows);
  } catch (err: any) {
    console.error("[sessions/]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — book
const BookSchema = z.object({
  teacherId:   z.number(),
  skill:       z.string().min(1),
  sessionType: z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledAt: z.string(),
  meetingLink: z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionsTable, transactionsTable, notificationsTable } = await import("../schema.js");
    const data = BookSchema.parse(req.body);
    const cfg  = SESSION_CONFIG[data.sessionType];

    if (data.teacherId === req.userId) return res.status(400).json({ error: "Can't book with yourself" });

    const learner = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
    if (!learner) return res.status(404).json({ error: "User not found" });
    if (learner.credits < cfg.credits) {
      return res.status(400).json({ error: `Need ${cfg.credits} credits, you have ${learner.credits}` });
    }

    const teacher = await db.query.usersTable.findFirst({ where: eq(usersTable.id, data.teacherId) });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [session] = await db.insert(sessionsTable).values({
      teacherId:   data.teacherId,
      learnerId:   req.userId!,
      skill:       data.skill,
      sessionType: data.sessionType,
      scheduledAt: new Date(data.scheduledAt),
      duration:    cfg.duration,
      status:      "pending",
      creditsUsed: cfg.credits,
      meetingLink: data.meetingLink ?? null,
    } as any).returning();

    await db.update(usersTable).set({ credits: learner.credits - cfg.credits }).where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "spent", amount: cfg.credits,
      description: `Booked ${cfg.label} — ${data.skill} with ${teacher.name}`,
      sessionId: session.id,
    } as any);

    await db.insert(notificationsTable).values({
      userId: data.teacherId, type: "session",
      title: "New Session Booked! 📅",
      message: `${learner.name} booked a ${cfg.label} for ${data.skill}`,
      actionUrl: "/sessions",
    } as any);

    res.status(201).json(session);
  } catch (err: any) {
    console.error("[sessions/book]", err.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/complete
router.patch("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionsTable, transactionsTable } = await import("../schema.js");
    const sessionId = parseInt(req.params.id);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.teacherId !== req.userId && session.learnerId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    await db.update(sessionsTable).set({ status: "completed", completedAt: new Date() } as any)
      .where(eq(sessionsTable.id, sessionId));

    const teacher = await db.query.usersTable.findFirst({ where: eq(usersTable.id, session.teacherId) });
    if (teacher) {
      await db.update(usersTable).set({
        credits:           teacher.credits + session.creditsUsed,
        sessionsCompleted: teacher.sessionsCompleted + 1,
        microSessionsCount: (session as any).sessionType !== "standard"
          ? ((teacher as any).microSessionsCount ?? 0) + 1
          : ((teacher as any).microSessionsCount ?? 0),
      } as any).where(eq(usersTable.id, session.teacherId));

      await db.insert(transactionsTable).values({
        userId: session.teacherId, type: "earned",
        amount: session.creditsUsed,
        description: `Taught ${session.skill} — ${SESSION_CONFIG[(session as any).sessionType]?.label ?? "session"}`,
        sessionId: session.id,
      } as any);
    }

    res.json({ success: true, message: "Session completed! Credits transferred." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/rate
router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionsTable } = await import("../schema.js");
    const sessionId = parseInt(req.params.id);
    const { score, review } = z.object({ score: z.number().min(1).max(5), review: z.string().max(500).optional() }).parse(req.body);

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });

    const isLearner = session.learnerId === req.userId;
    if (!isLearner && session.teacherId !== req.userId) return res.status(403).json({ error: "Not your session" });

    if (isLearner) {
      await db.update(sessionsTable).set({ teacherRating: score, teacherReview: review } as any).where(eq(sessionsTable.id, sessionId));
      const allRated = await db.select().from(sessionsTable).where(eq(sessionsTable.teacherId, session.teacherId));
      const rated = allRated.map(s => (s as any).teacherRating).filter(Boolean);
      if (rated.length > 0) {
        const avg = rated.reduce((a: number, b: number) => a + b, 0) / rated.length;
        await db.update(usersTable).set({ averageRating: avg } as any).where(eq(usersTable.id, session.teacherId));
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
