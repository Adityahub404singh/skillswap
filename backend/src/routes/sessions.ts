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
const PLATFORM_COMMISSION = 0.10;

const SKILL_MAX_CREDITS: Record<string, number> = {
  "English": 30, "Maths": 40, "Music": 40, "Chess": 30,
  "Spanish": 40, "Photography": 50, "Marketing": 60,
  "Design": 80, "Coding": 80, "Web Dev": 100,
  "JavaScript": 100, "Python": 100,
  "DSA": 180, "AI/ML": 220,
};

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email,
    bio: user.bio, avatar: user.avatar,
    skillsTeach: user.skillsTeach || [],
    skillsLearn: user.skillsLearn || [],
    credits: user.credits, trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating, pricePerHour: user.pricePerHour || 50, createdAt: user.createdAt,
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

// GET all sessions
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

// GET available group sessions
router.get("/group/available", async (req, res) => {
  try {
    const sessions = await db.select().from(sessionsTable);
    const groupSessions = sessions.filter(s => s.isGroup === 1 && s.status === "accepted");
    const formatted = await Promise.all(groupSessions.map(formatSession));
    res.json(formatted);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

const bookSchema = z.object({
  mentorId: z.number().int().positive(),
  skill: z.string().min(1),
  scheduledDate: z.string(),
  duration: z.number().int().positive().default(45),
  message: z.string().optional(),
  creditsAmount: z.number().int().min(10).max(250).optional(),
});

// POST book session
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = bookSchema.parse(req.body);
    const studentId = req.userId!;
    if (body.mentorId === studentId) {
      res.status(400).json({ error: "Bad Request", message: "You cannot book a session with yourself" });
      return;
    }
    const maxCredits = SKILL_MAX_CREDITS[body.skill] || 250;
    const creditsToUse = Math.min(body.creditsAmount || 10, maxCredits);
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    if (!student || student.credits < creditsToUse) {
      res.status(400).json({ error: "Bad Request", message: `Insufficient credits. Need ${creditsToUse}, have ${student?.credits || 0}.` });
      return;
    }
    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, body.mentorId)).limit(1);
    if (!mentor) { res.status(404).json({ error: "Not Found", message: "Mentor not found" }); return; }
    const meetLink = generateMeetLink();
    const [session] = await db.insert(sessionsTable).values({
      mentorId: body.mentorId, studentId,
      skill: body.skill, scheduledDate: new Date(body.scheduledDate),
      duration: body.duration, message: body.message,
      creditsAmount: creditsToUse, status: "requested", meetLink,
    }).returning();
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${creditsToUse}` }).where(eq(usersTable.id, studentId));
    await db.insert(transactionsTable).values({
      userId: studentId, amount: -creditsToUse, type: "spent",
      description: `Booked ${body.skill} session with ${mentor.name}`, sessionId: session.id,
    });
    sendBookingConfirmation(student.email, student.name, mentor.name, body.skill, new Date(body.scheduledDate), meetLink).catch(console.error);
    sendMentorNotification(mentor.email, mentor.name, student.name, body.skill, new Date(body.scheduledDate), meetLink).catch(console.error);
    res.status(201).json(await formatSession(session));
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Bad Request", message: err.message }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST create group session (mentor only)
router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, scheduledDate, duration, creditsAmount, maxStudents, message } = req.body;
    const mentorId = req.userId!;
    const meetLink = generateMeetLink();
    const [session] = await db.insert(sessionsTable).values({
      mentorId, studentId: mentorId, skill,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 45,
      creditsAmount: creditsAmount || 50,
      maxStudents: maxStudents || 10,
      isGroup: 1, status: "accepted", meetLink, message,
    }).returning();
    res.status(201).json(await formatSession(session));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST accept session
router.post("/:sessionId/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (session.mentorId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "requested") { res.status(400).json({ error: "Not in requested status" }); return; }
    const [updated] = await db.update(sessionsTable).set({ status: "accepted" }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json(await formatSession(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST join group session
router.post("/:sessionId/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const studentId = req.userId!;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (!session.isGroup) { res.status(400).json({ error: "Not a group session" }); return; }
    if (session.status !== "accepted") { res.status(400).json({ error: "Session not available" }); return; }
    if (session.mentorId === studentId) { res.status(400).json({ error: "Mentor cannot join own session" }); return; }
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    if (!student || student.credits < session.creditsAmount) {
      res.status(400).json({ error: "Insufficient credits" }); return;
    }
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${session.creditsAmount}` }).where(eq(usersTable.id, studentId));
    const commission = (session.maxStudents || 1) <= 2 ? 0.10 : (session.maxStudents || 1) <= 5 ? 0.15 : 0.20;
    const mentorEarns = Math.floor(session.creditsAmount * (1 - commission));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarns}` }).where(eq(usersTable.id, session.mentorId));
    await db.insert(transactionsTable).values({ userId: studentId, amount: -session.creditsAmount, type: "spent", description: `Joined group: ${session.skill}`, sessionId: session.id });
    await db.insert(transactionsTable).values({ userId: session.mentorId, amount: mentorEarns, type: "earned", description: `Group earning: ${session.skill} (+${mentorEarns} cr)`, sessionId: session.id });
    res.json({ success: true, meetLink: session.meetLink, creditsDeducted: session.creditsAmount });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST negotiate price
router.post("/:sessionId/negotiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { proposedPrice } = req.body;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "requested") { res.status(400).json({ error: "Cannot negotiate now" }); return; }
    const finalPrice = Math.min(Math.max(proposedPrice, 10), 250);
    const [updated] = await db.update(sessionsTable).set({ negotiatedPrice: finalPrice, creditsAmount: finalPrice }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json({ success: true, negotiatedPrice: finalPrice, session: await formatSession(updated) });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST start session
router.post("/:sessionId/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "accepted") { res.status(400).json({ error: "Must be accepted first" }); return; }
    const [updated] = await db.update(sessionsTable).set({ startedAt: new Date(), status: "in_progress" }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json(await formatSession(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST complete session
router.post("/:sessionId/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "accepted" && session.status !== "in_progress") { res.status(400).json({ error: "Invalid status" }); return; }

    const now = new Date();
    const startTime = session.startedAt || session.scheduledDate;
    const actualMinutes = Math.floor((now.getTime() - new Date(startTime).getTime()) / 60000);
    const total = session.creditsAmount;
    let mentorEarns = 0;
    let refundStudent = 0;

    if (actualMinutes < 10) {
      refundStudent = total;
    } else if (actualMinutes < 30) {
      mentorEarns = Math.floor(total * 0.5 * (1 - PLATFORM_COMMISSION));
      refundStudent = Math.floor(total * 0.5);
    } else {
      mentorEarns = total - Math.floor(total * PLATFORM_COMMISSION);
    }

    await db.update(sessionsTable).set({ status: "completed", completedAt: now, actualDuration: actualMinutes }).where(eq(sessionsTable.id, sessionId));

    if (mentorEarns > 0) {
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarns}`, sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, session.mentorId));
      await db.insert(transactionsTable).values({ userId: session.mentorId, amount: mentorEarns, type: "earned", description: `Taught ${session.skill} - ${actualMinutes} min (+${mentorEarns} cr)`, sessionId: session.id });
    }
    if (refundStudent > 0) {
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundStudent}` }).where(eq(usersTable.id, session.studentId));
      await db.insert(transactionsTable).values({ userId: session.studentId, amount: refundStudent, type: "refund", description: `Refund - session ${actualMinutes} min`, sessionId: session.id });
    }

    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId)).limit(1);
    if (mentor) {
      const trustScore = Math.min(100, (mentor.averageRating || 0) * 10 + mentor.sessionsCompleted * 2);
      await db.update(usersTable).set({ trustScore }).where(eq(usersTable.id, session.mentorId));
    }
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId)).limit(1);
    if (student && mentor) sendRatingRequest(student.email, student.name, mentor.name, session.skill, session.id).catch(console.error);

    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

// POST cancel session
router.post("/:sessionId/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (session.mentorId !== req.userId && session.studentId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status === "completed" || session.status === "cancelled") { res.status(400).json({ error: "Cannot cancel" }); return; }
    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, sessionId));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
    await db.insert(transactionsTable).values({ userId: session.studentId, amount: session.creditsAmount, type: "refund", description: `Cancelled ${session.skill} - full refund`, sessionId: session.id });
    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal Server Error" }); }
});

export default router;