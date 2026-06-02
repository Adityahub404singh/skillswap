import { Router, type IRouter } from "express";
import { db, sessionsTable, usersTable, transactionsTable, ratingsTable } from "../db.js";
import { eq, sql, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { sendBookingConfirmation, sendMentorNotification, sendRatingRequest, generateMeetLink } from "../utils/email.js";

const router: IRouter = Router();
const PLATFORM_COMMISSION = 0.10;

const SKILL_MAX_CREDITS: Record<string, number> = {
  "English": 30, "Maths": 40, "Music": 40, "Chess": 30,
  "Spanish": 40, "Photography": 50, "Marketing": 60,
  "Design": 80, "Coding": 80, "Web Dev": 100,
  "JavaScript": 100, "Python": 100, "DSA": 180, "AI/ML": 220,
};

function normalizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") return [val];
  return [];
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, name: user.name, email: user.email,
    bio: user.bio, avatar: user.avatar,
    skillsTeach: normalizeStringArray(user.skillsTeach),
    skillsLearn: normalizeStringArray(user.skillsLearn),
    credits: user.credits, trustScore: user.trustScore,
    sessionsCompleted: user.sessionsCompleted,
    averageRating: user.averageRating,
    pricePerHour: user.pricePerHour || 50,
    createdAt: user.createdAt,
  };
}

async function formatSessionsBatch(sessions: (typeof sessionsTable.$inferSelect)[]) {
  if (sessions.length === 0) return [];
  const userIds = [...new Set([
    ...sessions.map(s => Number(s.mentorId)),
    ...sessions.map(s => Number(s.studentId)),
  ])].filter(id => !isNaN(id));
  const sessionIds = sessions.map(s => Number(s.id)).filter(id => !isNaN(id));
  if (userIds.length === 0) return sessions.map(s => ({ ...s, mentor: null, student: null, rating: null }));
  const [allUsers, allRatings] = await Promise.all([
    db.select().from(usersTable).where(inArray(usersTable.id, userIds)),
    sessionIds.length > 0
      ? db.select().from(ratingsTable).where(inArray(ratingsTable.sessionId, sessionIds))
      : Promise.resolve([]),
  ]);
  const userMap = Object.fromEntries(allUsers.map(u => [Number(u.id), u]));
  const ratingMap = Object.fromEntries(allRatings.map(r => [Number(r.sessionId), r]));
  return sessions.map(session => ({
    ...session,
    mentor: userMap[Number(session.mentorId)] ? formatUser(userMap[Number(session.mentorId)]) : null,
    student: userMap[Number(session.studentId)] ? formatUser(userMap[Number(session.studentId)]) : null,
    rating: ratingMap[Number(session.id)] || null,
  }));
}

async function formatSession(session: typeof sessionsTable.$inferSelect) {
  const [result] = await formatSessionsBatch([session]);
  return result;
}

function safeParseDateMs(val: unknown): number | null {
  if (!val) return null;
  const d = new Date(val as string | Date);
  return isNaN(d.getTime()) ? null : d.getTime();
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, status } = req.query;
    const userId = Number(req.userId!);
    let sessions = await db.select().from(sessionsTable);
    sessions = sessions.filter(s => {
      if (role === "mentor") return Number(s.mentorId) === userId;
      if (role === "student") return Number(s.studentId) === userId;
      return Number(s.mentorId) === userId || Number(s.studentId) === userId;
    });
    if (status && typeof status === "string") {
      sessions = sessions.filter(s => s.status === status);
    }
    sessions.sort((a, b) => (safeParseDateMs(b.createdAt) ?? 0) - (safeParseDateMs(a.createdAt) ?? 0));
    res.json(await formatSessionsBatch(sessions));
  } catch (err) { console.error("[sessions GET /]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.get("/group/available", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessions = await db.select().from(sessionsTable);
    const group = sessions.filter(s => s.isGroup === 1 && s.status === "accepted");
    res.json(await formatSessionsBatch(group));
  } catch (err) { console.error("[sessions GET /group]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

const bookSchema = z.object({
  mentorId: z.number().int().positive(),
  skill: z.string().min(1).max(100),
  scheduledDate: z.string(),
  duration: z.number().int().min(15).max(240).default(45),
  message: z.string().max(500).optional(),
  creditsAmount: z.number().int().min(10).max(250).optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = bookSchema.parse(req.body);
    const studentId = Number(req.userId!);
    if (body.mentorId === studentId) {
      res.status(400).json({ error: "Bad Request", message: "You cannot book a session with yourself" }); return;
    }
    const scheduledDateMs = safeParseDateMs(body.scheduledDate);
    if (!scheduledDateMs) { res.status(400).json({ error: "Bad Request", message: "Invalid scheduledDate" }); return; }
    if (scheduledDateMs < Date.now() - 60_000) {
      res.status(400).json({ error: "Bad Request", message: "Cannot book a session in the past" }); return;
    }
    const skillKey = Object.keys(SKILL_MAX_CREDITS).find(k => body.skill.toLowerCase().includes(k.toLowerCase()));
    const maxCredits = skillKey ? SKILL_MAX_CREDITS[skillKey] : 250;
    const creditsToUse = Math.min(body.creditsAmount || 10, maxCredits);
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    if (!student || (student.credits ?? 0) < creditsToUse) {
      res.status(400).json({ error: "Bad Request", message: `Insufficient credits. Need ${creditsToUse}, have ${student?.credits || 0}.` }); return;
    }
    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, body.mentorId)).limit(1);
    if (!mentor) { res.status(404).json({ error: "Not Found", message: "Mentor not found" }); return; }
    const mentorTeaches = normalizeStringArray(mentor.skillsTeach);
    const canTeach = mentorTeaches.some(s => s.toLowerCase().includes(body.skill.toLowerCase()) || body.skill.toLowerCase().includes(s.toLowerCase()));
    if (!canTeach) { res.status(400).json({ error: "Bad Request", message: "Mentor does not teach this skill" }); return; }
    const meetLink = generateMeetLink();
    const [session] = await db.insert(sessionsTable).values({
      mentorId: body.mentorId, studentId,
      skill: body.skill, scheduledDate: new Date(scheduledDateMs),
      duration: body.duration, message: body.message,
      creditsAmount: creditsToUse, status: "requested", meetLink,
    }).returning();
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${creditsToUse}` }).where(eq(usersTable.id, studentId));
    await db.insert(transactionsTable).values({ userId: studentId, amount: -creditsToUse, type: "spent", description: `Booked ${body.skill} session with ${mentor.name}`, sessionId: session.id });
    sendBookingConfirmation(student.email, student.name, mentor.name, body.skill, new Date(scheduledDateMs), meetLink).catch(console.error);
    sendMentorNotification(mentor.email, mentor.name, student.name, body.skill, new Date(scheduledDateMs), meetLink).catch(console.error);
    res.status(201).json(await formatSession(session));
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "Bad Request", message: err.errors[0]?.message }); return; }
    console.error("[sessions POST /]", err); res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, scheduledDate, duration, creditsAmount, maxStudents, message } = req.body;
    const mentorId = Number(req.userId!);
    if (!skill || !scheduledDate) { res.status(400).json({ error: "skill and scheduledDate required" }); return; }
    const scheduledDateMs = safeParseDateMs(scheduledDate);
    if (!scheduledDateMs) { res.status(400).json({ error: "Invalid scheduledDate" }); return; }
    const meetLink = generateMeetLink();
    const [session] = await db.insert(sessionsTable).values({
      mentorId, studentId: mentorId, skill,
      scheduledDate: new Date(scheduledDateMs),
      duration: Math.min(Math.max(Number(duration) || 45, 15), 240),
      creditsAmount: Math.min(Math.max(Number(creditsAmount) || 50, 10), 250),
      maxStudents: Math.min(Math.max(Number(maxStudents) || 10, 2), 50),
      isGroup: 1, status: "accepted", meetLink, message,
    }).returning();
    res.status(201).json(await formatSession(session));
  } catch (err) { console.error("[sessions POST /group]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (Number(session.mentorId) !== Number(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "requested") { res.status(400).json({ error: "Session is not in requested status" }); return; }
    const [updated] = await db.update(sessionsTable).set({ status: "accepted" }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json(await formatSession(updated));
  } catch (err) { console.error("[sessions POST /:id/accept]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const studentId = Number(req.userId!);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (!session.isGroup) { res.status(400).json({ error: "Not a group session" }); return; }
    if (session.status !== "accepted") { res.status(400).json({ error: "Session not available" }); return; }
    if (Number(session.mentorId) === studentId) { res.status(400).json({ error: "Mentor cannot join own session" }); return; }
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    if (!student || (student.credits ?? 0) < session.creditsAmount) { res.status(400).json({ error: "Insufficient credits" }); return; }
    const maxS = session.maxStudents || 10;
    const commission = maxS <= 2 ? 0.10 : maxS <= 5 ? 0.15 : 0.20;
    const mentorEarns = Math.floor(session.creditsAmount * (1 - commission));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${session.creditsAmount}` }).where(eq(usersTable.id, studentId));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarns}` }).where(eq(usersTable.id, Number(session.mentorId)));
    await db.insert(transactionsTable).values({ userId: studentId, amount: -session.creditsAmount, type: "spent", description: `Joined group: ${session.skill}`, sessionId: session.id });
    await db.insert(transactionsTable).values({ userId: Number(session.mentorId), amount: mentorEarns, type: "earned", description: `Group earning: ${session.skill}`, sessionId: session.id });
    res.json({ success: true, meetLink: session.meetLink, creditsDeducted: session.creditsAmount });
  } catch (err) { console.error("[sessions POST /:id/join]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/negotiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const finalPrice = Math.min(Math.max(Number(req.body.proposedPrice) || 10, 10), 250);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (Number(session.mentorId) !== Number(req.userId) && Number(session.studentId) !== Number(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "requested") { res.status(400).json({ error: "Cannot negotiate now" }); return; }
    const [updated] = await db.update(sessionsTable).set({ negotiatedPrice: finalPrice, creditsAmount: finalPrice }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json({ success: true, negotiatedPrice: finalPrice, session: await formatSession(updated) });
  } catch (err) { console.error("[sessions POST /:id/negotiate]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (Number(session.mentorId) !== Number(req.userId) && Number(session.studentId) !== Number(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status !== "accepted") { res.status(400).json({ error: "Session must be accepted first" }); return; }
    const [updated] = await db.update(sessionsTable).set({ startedAt: new Date(), status: "in_progress" }).where(eq(sessionsTable.id, sessionId)).returning();
    res.json(await formatSession(updated));
  } catch (err) { console.error("[sessions POST /:id/start]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (Number(session.mentorId) !== Number(req.userId) && Number(session.studentId) !== Number(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status === "completed") { res.status(400).json({ error: "Session already completed" }); return; }
    if (session.status !== "accepted" && session.status !== "in_progress") { res.status(400).json({ error: "Invalid status to complete" }); return; }
    const now = new Date();
    const startMs = safeParseDateMs(session.startedAt) ?? safeParseDateMs(session.scheduledDate) ?? now.getTime();
    const actualMinutes = Math.max(0, Math.floor((now.getTime() - startMs) / 60_000));
    const total = session.creditsAmount;
    let mentorEarns = 0, refundStudent = 0;
    if (actualMinutes < 10) { refundStudent = total; }
    else if (actualMinutes < 30) { mentorEarns = Math.floor(total * 0.5 * (1 - PLATFORM_COMMISSION)); refundStudent = Math.floor(total * 0.5); }
    else { mentorEarns = total - Math.floor(total * PLATFORM_COMMISSION); }
    await db.update(sessionsTable).set({ status: "completed", completedAt: now, actualDuration: actualMinutes }).where(eq(sessionsTable.id, sessionId));
    if (mentorEarns > 0) {
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarns}`, sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, Number(session.mentorId)));
      await db.insert(transactionsTable).values({ userId: Number(session.mentorId), amount: mentorEarns, type: "earned", description: `Taught ${session.skill} - ${actualMinutes} min`, sessionId: session.id });
    }
    if (refundStudent > 0) {
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundStudent}` }).where(eq(usersTable.id, Number(session.studentId)));
      await db.insert(transactionsTable).values({ userId: Number(session.studentId), amount: refundStudent, type: "refund", description: `Refund - session ${actualMinutes} min`, sessionId: session.id });
    }
    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, Number(session.mentorId))).limit(1);
    if (mentor) {
      const trustScore = Math.min(100, (Number(mentor.averageRating) || 0) * 10 + (Number(mentor.sessionsCompleted) || 0) * 2);
      await db.update(usersTable).set({ trustScore }).where(eq(usersTable.id, Number(session.mentorId)));
    }
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, Number(session.studentId))).limit(1);
    if (student && mentor) sendRatingRequest(student.email, student.name, mentor.name, session.skill, session.id).catch(console.error);
    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) { console.error("[sessions POST /:id/complete]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/:sessionId/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(String(req.params.sessionId));
    if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not Found" }); return; }
    if (Number(session.mentorId) !== Number(req.userId) && Number(session.studentId) !== Number(req.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
    if (session.status === "completed" || session.status === "cancelled") { res.status(400).json({ error: "Cannot cancel" }); return; }
    const wasStarted = session.status === "in_progress";
    const refundAmount = wasStarted ? Math.floor(session.creditsAmount * 0.5) : session.creditsAmount;
    await db.update(sessionsTable).set({ status: "cancelled" }).where(eq(sessionsTable.id, sessionId));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundAmount}` }).where(eq(usersTable.id, Number(session.studentId)));
    await db.insert(transactionsTable).values({ userId: Number(session.studentId), amount: refundAmount, type: "refund", description: `Cancelled ${session.skill} - ${wasStarted ? "50%" : "full"} refund`, sessionId: session.id });
    const [updated] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId)).limit(1);
    res.json(await formatSession(updated));
  } catch (err) { console.error("[sessions POST /:id/cancel]", err); res.status(500).json({ error: "Internal Server Error" }); }
});

export default router;
