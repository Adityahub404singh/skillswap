import { Router, type IRouter } from "express";
import { db, sessionsTable, usersTable, transactionsTable, ratingsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

const CREDITS_PER_SESSION = 10;

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    skillsTeach: user.skillsTeach || [],
    skillsLearn: user.skillsLearn || [],
    credits: user.credits,
    trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating,
    createdAt: user.createdAt,
  };
}

async function formatSession(session: typeof sessionsTable.$inferSelect) {
  const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId)).limit(1);
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId)).limit(1);
  const [rating] = await db.select().from(ratingsTable).where(eq(ratingsTable.sessionId, session.id)).limit(1);

  return {
    ...session,
    mentor: mentor ? formatUser(mentor) : null,
    student: student ? formatUser(student) : null,
    rating: rating || null,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, status } = req.query;
    const userId = req.userId!;

    let sessions = await db.select().from(sessionsTable);

    sessions = sessions.filter(s => {
      if (role === "mentor") return s.mentorId === userId;
      if (role === "student") return s.studentId === userId;
      return s.mentorId === userId || s.studentId === userId;
    });

    if (status && typeof status === "string") {
      sessions = sessions.filter(s => s.status === status);
    }

    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const formatted = await Promise.all(sessions.map(formatSession));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const bookSchema = z.object({
  mentorId: z.number().int().positive(),
  skill: z.string().min(1),
  scheduledDate: z.string(),
  duration: z.number().int().positive().default(60),
  message: z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = bookSchema.parse(req.body);
    const studentId = req.userId!;

    if (body.mentorId === studentId) {
      res.status(400).json({ error: "Bad Request", message: "You cannot book a session with yourself" });
      return;
    }

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    if (!student || student.credits < CREDITS_PER_SESSION) {
      res.status(400).json({ error: "Bad Request", message: "Insufficient credits" });
      return;
    }

    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, body.mentorId)).limit(1);
    if (!mentor) {
      res.status(404).json({ error: "Not Found", message: "Mentor not found" });
      return;
    }

    const [session] = await db.insert(sessionsTable).values({
      mentorId: body.mentorId,
      studentId,
      skill: body.skill,
      scheduledDate: new Date(body.scheduledDate),
      duration: body.duration,
      message: body.message,
      creditsAmount: CREDITS_PER_SESSION,
      status: "requested",
    }).returning();

    res.status(201).json(await formatSession(session));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Bad Request", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:sessionId/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);

    if (!session) {
      res.status(404).json({ error: "Not Found", message: "Session not found" });
      return;
    }

    if (session.mentorId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Only the mentor can accept sessions" });
      return;
    }

    if (session.status !== "requested") {
      res.status(400).json({ error: "Bad Request", message: "Session is not in requested status" });
      return;
    }

    const [updated] = await db.update(sessionsTable)
      .set({ status: "accepted" })
      .where(eq(sessionsTable.id, sessionId))
      .returning();

    res.json(await formatSession(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:sessionId/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);

    if (!session) {
      res.status(404).json({ error: "Not Found", message: "Session not found" });
      return;
    }

    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Not authorized" });
      return;
    }

    if (session.status !== "accepted") {
      res.status(400).json({ error: "Bad Request", message: "Session must be accepted before completing" });
      return;
    }

    await db.update(sessionsTable)
      .set({ status: "completed" })
      .where(eq(sessionsTable.id, sessionId));

    await db.update(usersTable)
      .set({ credits: usersTable.credits - session.creditsAmount })
      .where(eq(usersTable.id, session.studentId));

    await db.insert(transactionsTable).values({
      userId: session.studentId,
      amount: -session.creditsAmount,
      type: "spent",
      description: `Learned ${session.skill}`,
      sessionId: session.id,
    });

    await db.update(usersTable)
      .set({
        credits: usersTable.credits + session.creditsAmount,
        sessionsCompleted: usersTable.sessionsCompleted + 1,
      })
      .where(eq(usersTable.id, session.mentorId));

    await db.insert(transactionsTable).values({
      userId: session.mentorId,
      amount: session.creditsAmount,
      type: "earned",
      description: `Taught ${session.skill}`,
      sessionId: session.id,
    });

    const mentor = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId)).limit(1);
    if (mentor[0]) {
      const completedSessions = mentor[0].sessionsCompleted;
      const avgRating = mentor[0].averageRating || 0;
      const trustScore = avgRating * 10 + completedSessions;
      await db.update(usersTable)
        .set({ trustScore })
        .where(eq(usersTable.id, session.mentorId));
    }

    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:sessionId/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);

    if (!session) {
      res.status(404).json({ error: "Not Found", message: "Session not found" });
      return;
    }

    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Not authorized" });
      return;
    }

    if (session.status === "completed" || session.status === "cancelled") {
      res.status(400).json({ error: "Bad Request", message: "Session cannot be cancelled" });
      return;
    }

    const [updated] = await db.update(sessionsTable)
      .set({ status: "cancelled" })
      .where(eq(sessionsTable.id, sessionId))
      .returning();

    res.json(await formatSession(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
