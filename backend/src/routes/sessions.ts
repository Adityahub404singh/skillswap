import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { sessionsTable } from "../schema/sessions.js";
import { usersTable } from "../schema/users.js";
import { transactionsTable } from "../schema/transactions.js";
import { ratingsTable } from "../schema/ratings.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { sendBookingConfirmation, sendMentorNotification, sendRatingRequest, generateMeetLink } from "../utils/email.js";

const router: IRouter = Router();

const CREDITS_PER_SESSION = 10;
const PLATFORM_COMMISSION = 0.10;

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

// GET /sessions
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

// POST /sessions - Book session with email + Meet link
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
      res.status(400).json({ error: "Bad Request", message: "Insufficient credits. You need at least 10 credits." });
      return;
    }

    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, body.mentorId)).limit(1);
    if (!mentor) {
      res.status(404).json({ error: "Not Found", message: "Mentor not found" });
      return;
    }

    // Generate Google Meet link
    const meetLink = generateMeetLink();

    const [session] = await db.insert(sessionsTable).values({
      mentorId: body.mentorId,
      studentId,
      skill: body.skill,
      scheduledDate: new Date(body.scheduledDate),
      duration: body.duration,
      message: body.message,
      creditsAmount: CREDITS_PER_SESSION,
      status: "requested",
      meetLink,
    }).returning();

    // Deduct credits from student
    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} - ${CREDITS_PER_SESSION}` })
      .where(eq(usersTable.id, studentId));

    await db.insert(transactionsTable).values({
      userId: studentId,
      amount: -CREDITS_PER_SESSION,
      type: "spent",
      description: `Booked ${body.skill} session with ${mentor.name}`,
      sessionId: session.id,
    });

    // Send emails (non-blocking)
    const scheduledDate = new Date(body.scheduledDate);
    sendBookingConfirmation(
      student.email, student.name, mentor.name,
      body.skill, scheduledDate, meetLink
    ).catch(console.error);

    sendMentorNotification(
      mentor.email, mentor.name, student.name,
      body.skill, scheduledDate, meetLink
    ).catch(console.error);

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

// POST /sessions/:sessionId/accept
router.post("/:sessionId/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found", message: "Session not found" }); return; }
    if (session.mentorId !== req.userId) { res.status(403).json({ error: "Forbidden", message: "Only mentor can accept" }); return; }
    if (session.status !== "requested") { res.status(400).json({ error: "Bad Request", message: "Session not in requested status" }); return; }
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

// POST /sessions/:sessionId/complete
router.post("/:sessionId/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found", message: "Session not found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Not authorized" }); return;
    }
    if (session.status !== "accepted") { res.status(400).json({ error: "Bad Request", message: "Session must be accepted first" }); return; }

    const totalCredits = session.creditsAmount;
    const commission = Math.floor(totalCredits * PLATFORM_COMMISSION);
    const mentorEarns = totalCredits - commission;

    await db.update(sessionsTable).set({ status: "completed" }).where(eq(sessionsTable.id, sessionId));

    await db.update(usersTable)
      .set({
        credits: sql`${usersTable.credits} + ${mentorEarns}`,
        sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1`,
      })
      .where(eq(usersTable.id, session.mentorId));

    await db.insert(transactionsTable).values({
      userId: session.mentorId,
      amount: mentorEarns,
      type: "earned",
      description: `Taught ${session.skill} (+${mentorEarns} cr, ${commission} cr platform fee)`,
      sessionId: session.id,
    });

    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId)).limit(1);
    if (mentor) {
      const trustScore = Math.min(100, (mentor.averageRating || 0) * 10 + mentor.sessionsCompleted * 2);
      await db.update(usersTable).set({ trustScore }).where(eq(usersTable.id, session.mentorId));
    }

    // Send rating request email
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId)).limit(1);
    if (student && mentor) {
      sendRatingRequest(student.email, student.name, mentor.name, session.skill, session.id).catch(console.error);
    }

    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /sessions/:sessionId/cancel
router.post("/:sessionId/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found", message: "Session not found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      res.status(403).json({ error: "Forbidden", message: "Not authorized" }); return;
    }
    if (session.status === "completed" || session.status === "cancelled") {
      res.status(400).json({ error: "Bad Request", message: "Cannot cancel this session" }); return;
    }

    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, sessionId));

    // Refund credits to student
    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` })
      .where(eq(usersTable.id, session.studentId));

    await db.insert(transactionsTable).values({
      userId: session.studentId,
      amount: session.creditsAmount,
      type: "refund",
      description: `Cancelled ${session.skill} session - full refund`,
      sessionId: session.id,
    });

    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;