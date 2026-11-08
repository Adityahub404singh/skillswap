import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "../db.js";
import { eq, or, desc, asc, sql, and, inArray, gte, lte, gt, ne, isNull, type SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";
import { notify } from "../notify.js";
import {
  sessionsTable,
  usersTable,
  transactionsTable,
  groupEnrollmentsTable,
} from "../schema/index.js";

// ==============================================================
// CONFIGURATION
// ==============================================================
const SESSION_CONFIG: Record<string, { duration: number; multiplier: number; label: string }> = {
  micro_15: { duration: 15, multiplier: 0.25, label: "15-min Quick Session" },
  micro_30: { duration: 30, multiplier: 0.50, label: "30-min Session" },
  doubt:    { duration: 20, multiplier: 0.33, label: "Doubt Solving" },
  standard: { duration: 60, multiplier: 1.00, label: "1-hour Session" },
  extended: { duration: 90, multiplier: 1.50, label: "1.5-hour Deep Dive" },
};

// Money
const PLATFORM_FEE_PCT        = 0.15; // 15% platform cut
const ESCROW_CLEARANCE_HOURS  = 24;   // dispute window before the mentor is paid

// Delivery thresholds
const MVT_THRESHOLD           = 0.80; // >= 80% of the time delivered = full payout
const AUTO_CANCEL_THRESHOLD   = 0.20; // < 20% delivered = full refund, no payout

// Anti-fraud / abuse
const MAX_SESSIONS_PER_WEEK   = 3;    // per student-mentor pair
const MAX_STUDENTS_CAP        = 50;
const MAX_CREDITS_PER_STUDENT = 500;
const MAX_ACTIVE_GROUPS       = 5;    // open group classes per mentor
const OTP_MAX_ATTEMPTS        = 5;
const OTP_WINDOW_MS           = 15 * 60 * 1000;

// Scheduling windows
const START_EARLY_MINUTES     = 15;   // earliest a mentor can start before the scheduled time
const JOIN_LATE_MINUTES       = 15;   // latest a student can still join a group class after it was due
const EXPIRY_GRACE_MINUTES    = 30;   // after (start + duration + grace), unstarted sessions expire
const AUTO_CLOSE_GRACE_MINUTES = 120; // after (start + duration + grace), live sessions are closed
const MAX_DAYS_AHEAD          = 90;
const HEARTBEAT_TIMEOUT_SECS  = 90;

// Cron secret: never fall back to a guessable default in production.
const CRON_SECRET =
  process.env.CRON_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-cron-secret-change-in-prod");

const router: IRouter = Router();

// ==============================================================
// SMALL HELPERS
// ==============================================================
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (msg: string) => new HttpError(400, msg);

/** Wraps a handler: consistent { error } responses, no internal details leaked on 500. */
const route = (fn: (req: any, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err: any) {
      if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0]?.message || "Invalid input" });
      console.error(`[sessions] ${req.method} ${req.originalUrl}`, err);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };

/** Notifications must never break a money flow. */
const safe = (fn: () => unknown) => {
  try { Promise.resolve(fn()).catch((e: any) => console.warn("[notify]", e?.message)); }
  catch (e: any) { console.warn("[notify]", e?.message); }
};

const parseId = (v: unknown) => {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isInteger(n) || n <= 0) throw bad("Invalid session id");
  return n;
};
const noHtml = (v: string) => !/<[^>]*>/.test(v);
const otpCode = () => String(randomInt(100000, 1000000));
const minsUntil = (d: Date | string) => (new Date(d).getTime() - Date.now()) / 60000;

async function getSession(id: number): Promise<any> {
  const [s] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!s) throw new HttpError(404, "Session not found");
  return s;
}

async function getUser(id: number): Promise<any> {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return u;
}

/**
 * Atomic compare-and-set on a session's status. Returns true only for the single
 * request that actually performed the transition (prevents double refunds/payouts).
 */
async function claimSession(id: number, from: string[], patch: Record<string, unknown>, extra?: SQL): Promise<boolean> {
  const rows = await db.update(sessionsTable).set(patch as any)
    .where(and(eq(sessionsTable.id, id), inArray(sessionsTable.status as any, from), extra))
    .returning({ id: sessionsTable.id });
  return rows.length > 0;
}

async function claimEnrollment(id: number, from: string[], patch: Record<string, unknown>): Promise<boolean> {
  const rows = await db.update(groupEnrollmentsTable).set(patch as any)
    .where(and(eq(groupEnrollmentsTable.id, id), inArray(groupEnrollmentsTable.status as any, from)))
    .returning({ id: groupEnrollmentsTable.id });
  return rows.length > 0;
}

/** Wallet debit that cannot overdraw, even under concurrent requests. */
async function debitCredits(userId: number, amount: number): Promise<boolean> {
  if (!Number.isInteger(amount) || amount <= 0) return false;
  const rows = await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} - ${amount}` } as any)
    .where(and(eq(usersTable.id, userId), gte(usersTable.credits, amount)))
    .returning({ id: usersTable.id });
  return rows.length > 0;
}

async function logTx(userId: number, type: string, amount: number, description: string, sessionId: number) {
  await db.insert(transactionsTable).values({ userId, type, amount, description, sessionId } as any);
}

/** Credits wallet back and writes an immutable refund entry. */
async function refundStudent(studentId: number, amount: number, sessionId: number, reason: string) {
  if (!studentId || amount <= 0) return;
  await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} + ${amount}` } as any)
    .where(eq(usersTable.id, studentId));
  await logTx(studentId, "refund", amount, `[REFUND] ${reason}`, sessionId);
}

async function getActiveEnrollments(sessionId: number): Promise<any[]> {
  return await db.select().from(groupEnrollmentsTable).where(and(
    eq(groupEnrollmentsTable.sessionId, sessionId),
    eq(groupEnrollmentsTable.status, "active"),
  ));
}

/** Refunds one active enrollment exactly once. */
async function refundEnrollment(e: any, sessionId: number, skill: string, reason: string, notifyUser = true) {
  const claimed = await claimEnrollment(e.id, ["active"], {
    status: "refunded", refundAmount: e.creditsAmount, refundedAt: new Date(),
  });
  if (!claimed) return;
  await refundStudent(e.studentId, e.creditsAmount, sessionId, reason);
  if (notifyUser) safe(() => notify.sessionCancelled(e.studentId, skill, e.creditsAmount));
}

/** Anti-fraud: limits repeat sessions between the same two accounts. */
async function checkVelocityAndCollusion(studentId: number, mentorId: number) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await db.select({ id: sessionsTable.id }).from(sessionsTable).where(and(
    eq(sessionsTable.studentId, studentId),
    eq(sessionsTable.mentorId, mentorId),
    gte(sessionsTable.createdAt, oneWeekAgo),
  ));
  if (recent.length >= MAX_SESSIONS_PER_WEEK) {
    throw new HttpError(429, `You can only have ${MAX_SESSIONS_PER_WEEK} sessions with the same mentor per week.`);
  }
}

/** Prevents a mentor from accepting two overlapping sessions. */
async function mentorHasConflict(mentorId: number, start: Date, durationMins: number, excludeId: number) {
  const from = new Date(start.getTime() - 3 * 3600000);
  const to = new Date(start.getTime() + 3 * 3600000);
  const rows: any[] = await db.select().from(sessionsTable).where(and(
    eq(sessionsTable.mentorId, mentorId),
    or(eq(sessionsTable.status, "accepted"), eq(sessionsTable.status, "in_progress")) as any,
    gte(sessionsTable.scheduledDate, from),
    lte(sessionsTable.scheduledDate, to),
  ));
  const s0 = start.getTime();
  const e0 = s0 + durationMins * 60000;
  return rows.some(r => {
    if (r.id === excludeId) return false;
    const rs = new Date(r.scheduledDate).getTime();
    const re = rs + (r.duration || 60) * 60000;
    return rs < e0 && s0 < re;
  });
}

// ----- OTP brute-force guard (per server instance) -----
const otpAttempts = new Map<number, { count: number; resetAt: number }>();
function assertOtpNotLocked(sessionId: number) {
  const rec = otpAttempts.get(sessionId);
  if (rec && rec.resetAt > Date.now() && rec.count >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(429, "Too many wrong OTP attempts. Try again in a few minutes.");
  }
}
function recordOtpFailure(sessionId: number) {
  const now = Date.now();
  if (otpAttempts.size > 5000) for (const [k, v] of otpAttempts) if (v.resetAt <= now) otpAttempts.delete(k);
  const rec = otpAttempts.get(sessionId);
  if (!rec || rec.resetAt <= now) otpAttempts.set(sessionId, { count: 1, resetAt: now + OTP_WINDOW_MS });
  else rec.count++;
}

// ----- Group settlement planning (pure) -----
type Plan = { enrollment: any; payout: number; refund: number };
function planSettlement(enrollments: any[], pctFor: (e: any) => number) {
  const plans: Plan[] = enrollments.map(e => {
    const credits = e.creditsAmount as number;
    const pct = Math.max(0, pctFor(e));
    if (pct < AUTO_CANCEL_THRESHOLD) return { enrollment: e, payout: 0, refund: credits };
    if (pct < MVT_THRESHOLD) {
      const payout = Math.floor(credits * pct);
      return { enrollment: e, payout, refund: credits - payout };
    }
    return { enrollment: e, payout: credits, refund: 0 };
  });
  return { plans, total: plans.reduce((a, p) => a + p.payout, 0) };
}

async function applySettlement(sessionId: number, plans: Plan[], refundReason: string) {
  for (const p of plans) {
    if (p.refund > 0) await refundStudent(p.enrollment.studentId, p.refund, sessionId, refundReason);
    await db.update(groupEnrollmentsTable).set(
      (p.payout > 0
        ? { status: "pending_clearance", completedAt: new Date() }
        : { status: "refunded", refundAmount: p.refund, refundedAt: new Date() }) as any,
    ).where(eq(groupEnrollmentsTable.id, p.enrollment.id));
  }
}

// ==============================================================
// DISCOVERY
// ==============================================================
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// ==============================================================
// GROUP SESSIONS: CREATE / BROWSE / MY ENROLLMENTS
// ==============================================================
const GroupSchema = z.object({
  skill: z.string().trim().min(3, "Enter a topic (at least 3 characters)").max(80).refine(noHtml, "No HTML allowed"),
  scheduledDate: z.string().refine(v => !Number.isNaN(Date.parse(v)), "Invalid date"),
  creditsAmount: z.coerce.number().int("Credits must be a whole number").min(1, "Credits per student required (min 1)")
    .max(MAX_CREDITS_PER_STUDENT, `Max ${MAX_CREDITS_PER_STUDENT} credits per student allowed`),
  maxStudents: z.coerce.number().int().min(2, "Group sessions need at least 2 student slots")
    .max(MAX_STUDENTS_CAP, `Max ${MAX_STUDENTS_CAP} students per group allowed`).default(10),
  message: z.string().trim().max(200, "Message is too long").optional().nullable(),
  sessionType: z.enum(["micro_15", "micro_30", "standard", "extended"]).default("standard"),
});

router.post("/group", requireAuth, route(async (req, res) => {
  const data = GroupSchema.parse(req.body);
  const scheduledAt = new Date(data.scheduledDate);
  if (scheduledAt.getTime() < Date.now() + 5 * 60000) throw bad("Choose a time at least 5 minutes from now");
  if (scheduledAt.getTime() > Date.now() + MAX_DAYS_AHEAD * 86400000) throw bad(`You can schedule up to ${MAX_DAYS_AHEAD} days ahead`);

  const mentor = await getUser(req.userId);
  if (!mentor) throw new HttpError(404, "User not found");

  const open = await db.select({ id: sessionsTable.id }).from(sessionsTable).where(and(
    eq(sessionsTable.mentorId, req.userId),
    eq(sessionsTable.isGroup as any, 1),
    eq(sessionsTable.status, "accepted"),
  ));
  if (open.length >= MAX_ACTIVE_GROUPS) throw bad(`You can have up to ${MAX_ACTIVE_GROUPS} open group classes at once`);

  const cfg = SESSION_CONFIG[data.sessionType];
  if (await mentorHasConflict(req.userId, scheduledAt, cfg.duration, 0)) {
    throw bad("You already have a session at that time");
  }

  const [session] = await db.insert(sessionsTable).values({
    mentorId:      req.userId,
    studentId:     0,
    skill:         data.skill,
    sessionType:   data.sessionType,
    duration:      cfg.duration,
    status:        "accepted",
    creditsAmount: data.creditsAmount,
    message:       data.message?.trim() || null,
    meetLink:      `https://meet.jit.si/SkillSwapGroup_${randomUUID()}`,
    isGroup:       1,
    maxStudents:   data.maxStudents,
    sessionOtp:    otpCode(),
    scheduledDate: scheduledAt,
  } as any).returning();

  res.status(201).json(session);
}));

router.get("/group/browse", requireAuth, route(async (req, res) => {
  const lateCutoff = new Date(Date.now() - JOIN_LATE_MINUTES * 60000);
  const groups: any[] = await db.select().from(sessionsTable)
    .where(and(
      eq(sessionsTable.isGroup as any, 1),
      or(
        and(eq(sessionsTable.status, "accepted"), gte(sessionsTable.scheduledDate, lateCutoff)),
        eq(sessionsTable.status, "in_progress"),
      ) as any,
    ))
    .orderBy(asc(sessionsTable.scheduledDate))
    .limit(50);

  if (groups.length === 0) return res.json([]);

  const sessionIds = groups.map(s => s.id);
  const mentorIds = [...new Set(groups.map(s => s.mentorId))] as number[];
  const [enrollments, mentors]: [any[], any[]] = await Promise.all([
    db.select().from(groupEnrollmentsTable).where(and(
      inArray(groupEnrollmentsTable.sessionId, sessionIds),
      eq(groupEnrollmentsTable.status, "active"),
    )),
    db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating })
      .from(usersTable).where(inArray(usersTable.id, mentorIds)),
  ]);
  const mentorMap = Object.fromEntries(mentors.map(m => [m.id, m]));

  res.json(groups.map(session => {
    const list = enrollments.filter(e => e.sessionId === session.id);
    const mine = list.find(e => e.studentId === req.userId);
    const spotsLeft = Math.max(0, (session.maxStudents || 10) - list.length);
    const isOwn = session.mentorId === req.userId;

    let isMyHeartbeatActive = false;
    if (mine?.lastHeartbeatAt) {
      isMyHeartbeatActive = (Date.now() - new Date(mine.lastHeartbeatAt).getTime()) / 1000 < HEARTBEAT_TIMEOUT_SECS;
    }

    return {
      ...session,
      sessionOtp: undefined,
      // The meeting link is a paid perk: only the mentor and enrolled students receive it.
      meetLink: isOwn || mine ? session.meetLink : undefined,
      enrolledCount: list.length,
      spotsLeft,
      isEnrolled: !!mine,
      isOwnSession: isOwn,
      isFull: spotsLeft <= 0 && !mine,
      isMyHeartbeatActive,
      myActiveSeconds: mine?.activeSeconds || 0,
      mentor: mentorMap[session.mentorId] || null,
    };
  }));
}));

router.get("/group/my-enrollments", requireAuth, route(async (req, res) => {
  const enrollments: any[] = await db.select().from(groupEnrollmentsTable)
    .where(and(
      eq(groupEnrollmentsTable.studentId, req.userId),
      inArray(groupEnrollmentsTable.status as any, ["active", "pending_clearance", "completed"]),
    ))
    .orderBy(desc(groupEnrollmentsTable.createdAt))
    .limit(30);

  if (enrollments.length === 0) return res.json([]);

  const sessionIds = [...new Set(enrollments.map(e => e.sessionId))] as number[];
  const sessions: any[] = await db.select().from(sessionsTable).where(inArray(sessionsTable.id, sessionIds));
  const mentorIds = [...new Set(sessions.map(s => s.mentorId))] as number[];

  // Two batched queries instead of one-per-session.
  const [activeRows, mentors]: [any[], any[]] = await Promise.all([
    db.select({ sessionId: groupEnrollmentsTable.sessionId }).from(groupEnrollmentsTable).where(and(
      inArray(groupEnrollmentsTable.sessionId, sessionIds),
      eq(groupEnrollmentsTable.status, "active"),
    )),
    db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating })
      .from(usersTable).where(inArray(usersTable.id, mentorIds)),
  ]);
  const counts = new Map<number, number>();
  activeRows.forEach(r => counts.set(r.sessionId, (counts.get(r.sessionId) || 0) + 1));
  const mentorMap = Object.fromEntries(mentors.map(m => [m.id, m]));
  const sessionMap = new Map(sessions.map(s => [s.id, s]));

  const seen = new Set<number>();
  const out: any[] = [];
  for (const e of enrollments) {          // keeps newest-enrollment-first order
    const s = sessionMap.get(e.sessionId);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({
      ...s,
      sessionOtp: undefined,
      enrolledCount: counts.get(s.id) || 0,
      isEnrolled: true,
      enrollmentStatus: e.status,
      creditsLocked: e.creditsAmount || 0,
      mentor: mentorMap[s.mentorId] || null,
    });
  }
  res.json(out);
}));

// ==============================================================
// FLASH BOARD & DOUBTS
// ==============================================================
router.get("/flash/board", requireAuth, route(async (req, res) => {
  const doubts = await db.select().from(sessionsTable)
    .where(and(
      eq(sessionsTable.sessionType, "doubt"),
      eq(sessionsTable.status, "pending"),
      ne(sessionsTable.studentId, req.userId),
      gte(sessionsTable.createdAt, new Date(Date.now() - 24 * 3600000)),
    ))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(50);
  res.json(doubts);
}));

const FlashSchema = z.object({
  skill: z.string().trim().min(1, "Skill is required").max(50).refine(noHtml, "No HTML allowed"),
  message: z.string().trim().max(500).optional().nullable(),
  creditsAmount: z.coerce.number().int("Credits must be a whole number").min(3, "Minimum 3 credits").max(100, "Maximum 100 credits"),
});

router.post("/flash/post", requireAuth, route(async (req, res) => {
  const data = FlashSchema.parse(req.body);

  // Atomic debit (the old version trusted a client-supplied amount, including negatives).
  if (!(await debitCredits(req.userId, data.creditsAmount))) throw bad("Insufficient credits");

  let doubt: any;
  try {
    [doubt] = await db.insert(sessionsTable).values({
      studentId: req.userId, mentorId: 0, skill: data.skill, message: data.message ?? null,
      duration: SESSION_CONFIG.doubt.duration, creditsAmount: data.creditsAmount,
      sessionType: "doubt", status: "pending", scheduledDate: new Date(),
    } as any).returning();
  } catch (err) {
    await refundStudent(req.userId, data.creditsAmount, 0, "Doubt could not be posted");
    throw err;
  }
  await logTx(req.userId, "escrow_hold", data.creditsAmount, `[ESCROW] Locked for doubt: ${data.skill}`, doubt.id);
  res.status(201).json(doubt);
}));

router.post("/:id/claim-flash", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.sessionType !== "doubt" || session.mentorId !== 0 || session.status !== "pending") throw bad("This doubt was already claimed");
  if (session.studentId === req.userId) throw bad("You can't claim your own doubt");

  const rows = await db.update(sessionsTable).set({
    mentorId: req.userId, status: "accepted",
    meetLink: `https://meet.jit.si/SkillSwapFlash_${randomUUID()}`,
    sessionOtp: otpCode(),            // so the student has an OTP to share
  } as any).where(and(eq(sessionsTable.id, id), eq(sessionsTable.mentorId, 0), eq(sessionsTable.status, "pending")))
    .returning({ id: sessionsTable.id });
  if (rows.length === 0) throw new HttpError(409, "Another mentor just claimed this doubt");

  const mentor = await getUser(req.userId);
  safe(() => notify.sessionAccepted(session.studentId, mentor?.name || "A mentor", session.skill));
  res.json({ success: true });
}));

// ==============================================================
// 1-ON-1 BOOKING
// ==============================================================
const BookSchema = z.object({
  mentorId:      z.number().int(),
  skill:         z.string().min(1).max(50).trim().refine(noHtml, { message: "No HTML allowed" }),
  sessionType:   z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledDate: z.string().optional(),
  scheduledAt:   z.string().optional(),
  message:       z.string().max(500).optional().nullable(),
})
.refine(d => Boolean(d.scheduledDate || d.scheduledAt), { message: "Please pick a date and time", path: ["scheduledDate"] })
.refine(d => {
  const raw = d.scheduledDate || d.scheduledAt;
  return raw ? !Number.isNaN(Date.parse(raw)) : true;
}, { message: "Invalid date", path: ["scheduledDate"] })
.refine(d => {
  const raw = d.scheduledDate || d.scheduledAt;
  return raw ? new Date(raw) > new Date() : true;
}, { message: "Cannot schedule in the past", path: ["scheduledDate"] });

router.post("/", requireAuth, route(async (req, res) => {
  const data = BookSchema.parse(req.body);
  const cfg = SESSION_CONFIG[data.sessionType];
  if (data.mentorId === req.userId) throw bad("You can't book a session with yourself");

  const when = new Date((data.scheduledDate || data.scheduledAt)!);
  if (when.getTime() > Date.now() + MAX_DAYS_AHEAD * 86400000) throw bad(`You can book up to ${MAX_DAYS_AHEAD} days ahead`);

  await checkVelocityAndCollusion(req.userId, data.mentorId);

  const [learner, mentor] = await Promise.all([getUser(req.userId), getUser(data.mentorId)]);
  if (!learner) throw new HttpError(404, "User not found");
  if (!mentor) throw new HttpError(404, "Mentor not found");

  const baseRate = Math.max(mentor.pricePerHour || 10, 10);
  const credits = Math.max(Math.round(baseRate * cfg.multiplier), 3);

  if (!(await debitCredits(req.userId, credits))) {
    const fresh = await getUser(req.userId);
    throw bad(`Need ${credits} credits, you have ${fresh?.credits ?? 0}`);
  }

  let session: any;
  try {
    [session] = await db.insert(sessionsTable).values({
      mentorId: data.mentorId, studentId: req.userId, skill: data.skill, sessionType: data.sessionType,
      duration: cfg.duration, status: "requested", creditsAmount: credits, message: data.message ?? null,
      sessionOtp: otpCode(), scheduledDate: when,
    } as any).returning();
  } catch (err) {
    await refundStudent(req.userId, credits, 0, "Booking failed, credits returned");
    throw err;
  }

  await logTx(req.userId, "escrow_hold", credits, `[ESCROW] Locked for ${cfg.label} with ${mentor.name}`, session.id);
  safe(() => notify.sessionBooked(data.mentorId, learner.name, data.skill));
  res.status(201).json(session);
}));

// ==============================================================
// LIFECYCLE: ACCEPT / START / HEARTBEAT / COMPLETE
// ==============================================================
router.post("/:id/accept", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.mentorId !== req.userId) throw new HttpError(403, "Only the mentor can accept");
  if (session.isGroup === 1) throw bad("Group classes don't need to be accepted");
  if (session.status !== "requested") throw bad(`This request is already ${session.status}`);
  if (minsUntil(session.scheduledDate) < -(session.duration || 60)) throw bad("This session time has already passed");

  if (await mentorHasConflict(req.userId, new Date(session.scheduledDate), session.duration || 60, id)) {
    throw bad("You already have a session at that time");
  }

  const meetLink = `https://meet.jit.si/SkillSwap_${randomUUID()}`;
  const ok = await claimSession(id, ["requested"], { status: "accepted", meetLink });
  if (!ok) throw new HttpError(409, "This request was just updated. Refresh and try again");

  const mentor = await getUser(req.userId);
  safe(() => notify.sessionAccepted(session.studentId, mentor?.name || "Your mentor", session.skill));
  res.json({ success: true, meetLink });
}));

router.post("/:id/start", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.mentorId !== req.userId) throw new HttpError(403, "Only the mentor can start");
  if (session.isGroup === 1) throw bad("Use /start-group for group sessions");
  if (session.status !== "accepted") throw bad("Session must be accepted first");

  const early = minsUntil(session.scheduledDate);
  if (early > START_EARLY_MINUTES) {
    throw bad(`You can start this session ${START_EARLY_MINUTES} minutes before the scheduled time.`);
  }

  if (session.sessionOtp) {
    assertOtpNotLocked(id);
    if (String(req.body?.otp ?? "") !== String(session.sessionOtp)) {
      recordOtpFailure(id);
      throw bad("Invalid OTP. Ask your student for the correct code.");
    }
    otpAttempts.delete(id);
  }

  const ok = await claimSession(id, ["accepted"], { status: "in_progress", startedAt: new Date() });
  if (!ok) throw new HttpError(409, "Session was just updated. Refresh and try again");
  res.json({ success: true, message: "Session started securely!" });
}));

router.post("/:id/heartbeat", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.status !== "in_progress") throw bad("Session not active");

  if (session.isGroup === 1) {
    const [enrollment] = await db.select().from(groupEnrollmentsTable).where(and(
      eq(groupEnrollmentsTable.sessionId, id),
      eq(groupEnrollmentsTable.studentId, req.userId),
      eq(groupEnrollmentsTable.status, "active"),
    ));
    if (enrollment) {
      await db.update(groupEnrollmentsTable).set({
        lastHeartbeatAt: new Date(),
        activeSeconds: sql`${groupEnrollmentsTable.activeSeconds} + 60`,
        isConnected: 1,
      } as any).where(eq(groupEnrollmentsTable.id, enrollment.id));
    }
  } else if (session.studentId !== req.userId && session.mentorId !== req.userId) {
    throw new HttpError(403, "Unauthorized");
  }
  res.json({ success: true });
}));

router.post("/:id/complete", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.studentId !== req.userId) throw new HttpError(403, "Only the student can mark a session as done");
  if (session.isGroup === 1) throw bad("Use /end-group for group sessions");
  if (session.status !== "in_progress" || !session.startedAt) throw bad("The session must be started with the OTP first");

  const duration = session.duration || 60;
  const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 60000;
  const timePct = elapsed / duration;

  if (timePct < AUTO_CANCEL_THRESHOLD) {
    const minMins = Math.ceil(duration * AUTO_CANCEL_THRESHOLD);
    throw bad(`The session has only run ${Math.floor(elapsed)} min. You can mark it done after ${minMins} min, or report a problem.`);
  }

  let payout = session.creditsAmount as number;
  let refund = 0;
  if (timePct < MVT_THRESHOLD) {
    payout = Math.floor(payout * timePct);
    refund = session.creditsAmount - payout;
  }

  const ok = await claimSession(id, ["in_progress"], {
    status: "pending_clearance", completedAt: new Date(), actualDuration: Math.round(elapsed), creditsAmount: payout,
  });
  if (!ok) throw new HttpError(409, "Session was already completed or cancelled");

  if (refund > 0) {
    await refundStudent(session.studentId, refund, id, `Prorated refund: class ran ${Math.round(elapsed)}/${duration} min.`);
  }
  safe(() => notify.sessionCompleted(session.mentorId, session.skill, payout));

  res.json({
    success: true,
    message: `Session ended. ${payout} credits are held in escrow and clear in ${ESCROW_CLEARANCE_HOURS} hours unless you report a problem.`,
    prorated: timePct < MVT_THRESHOLD,
  });
}));

// ==============================================================
// DISPUTES & CANCELLATION
// ==============================================================
router.post("/:id/dispute", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 20) throw bad("Please describe the problem in at least 20 characters");
  if (reason.length > 500) throw bad("Please keep the description under 500 characters");

  const session = await getSession(id);
  if (session.studentId !== req.userId) throw new HttpError(403, "Only the student can report a problem");
  if (!["in_progress", "pending_clearance"].includes(session.status)) {
    throw bad(session.status === "requested" || session.status === "accepted"
      ? "This session hasn't happened yet. Cancel it instead to get a full refund."
      : `You can't report a problem on a ${session.status} session. Funds may have already cleared.`);
  }

  const ok = await claimSession(id, ["in_progress", "pending_clearance"], { status: "disputed", cancelReason: `[DISPUTED] ${reason}` });
  if (!ok) throw new HttpError(409, "This session was just updated. Refresh and try again");
  res.json({ success: true, message: "Report received. Funds are frozen while our team reviews the session." });
}));

router.post("/:id/cancel", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  const isMentor = session.mentorId === req.userId;
  const isStudent = session.studentId === req.userId;
  if (!isMentor && !isStudent) throw new HttpError(403, "Not your session");
  if (session.isGroup === 1 && !isMentor) throw bad("Students can leave a group class instead of cancelling it");
  if (!["requested", "accepted", "pending"].includes(session.status)) {
    throw bad("This session can't be cancelled any more. If something went wrong, report a problem instead.");
  }

  const reason = String(req.body?.reason ?? "Cancelled").trim().slice(0, 200) || "Cancelled";
  const ok = await claimSession(id, ["requested", "accepted", "pending"], {
    status: "cancelled", cancelReason: `[${isMentor ? "mentor" : "student"}] ${reason}`,
  });
  if (!ok) throw new HttpError(409, "This session was just updated. Refresh and try again");

  if (session.isGroup === 1) {
    for (const e of await getActiveEnrollments(id)) {
      await refundEnrollment(e, id, session.skill, `Group cancelled: ${session.skill}`);
    }
    if (session.mentorId) safe(() => notify.sessionCancelled(session.mentorId, session.skill, 0));
  } else {
    if (session.studentId && session.creditsAmount > 0) {
      await refundStudent(session.studentId, session.creditsAmount, id, `Cancelled: ${session.skill}`);
      safe(() => notify.sessionCancelled(session.studentId, session.skill, session.creditsAmount));
    }
    if (session.mentorId) safe(() => notify.sessionCancelled(session.mentorId, session.skill, 0));
  }

  res.json({ success: true, message: "Cancelled and refunded." });
}));

// ==============================================================
// GROUP: JOIN / LEAVE / START / END / MEMBERS
// ==============================================================
router.post("/:id/join-group", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.isGroup !== 1) throw bad("Invalid group session");
  if (session.status !== "accepted") throw bad("This class is not open for enrollment");
  if (session.mentorId === req.userId) throw bad("Mentors can't join their own group class");
  if (minsUntil(session.scheduledDate) < -JOIN_LATE_MINUTES) throw bad("This class is already underway");

  const [existing]: any[] = await db.select().from(groupEnrollmentsTable).where(and(
    eq(groupEnrollmentsTable.sessionId, id),
    eq(groupEnrollmentsTable.studentId, req.userId),
  ));
  if (existing?.status === "active") throw bad("You're already enrolled in this class");

  const maxStudents = session.maxStudents || 10;
  if ((await getActiveEnrollments(id)).length >= maxStudents) throw bad("This class is full");

  await checkVelocityAndCollusion(req.userId, session.mentorId);

  if (!(await debitCredits(req.userId, session.creditsAmount))) {
    const fresh = await getUser(req.userId);
    throw bad(`Need ${session.creditsAmount} credits, you have ${fresh?.credits ?? 0}`);
  }

  let enrollmentId: number;
  try {
    if (existing) {
      await db.update(groupEnrollmentsTable).set({
        status: "active", creditsAmount: session.creditsAmount, activeSeconds: 0, lastHeartbeatAt: null, isConnected: 0,
      } as any).where(eq(groupEnrollmentsTable.id, existing.id));
      enrollmentId = existing.id;
    } else {
      const [created] = await db.insert(groupEnrollmentsTable).values({
        sessionId: id, studentId: req.userId, creditsAmount: session.creditsAmount, status: "active",
      } as any).returning({ id: groupEnrollmentsTable.id });
      enrollmentId = created.id;
    }
  } catch (err) {
    await refundStudent(req.userId, session.creditsAmount, id, "Could not join class, credits returned");
    throw err;
  }

  await logTx(req.userId, "escrow_hold", session.creditsAmount, `[ESCROW] Joined group: ${session.skill}`, id);

  // Concurrency guard: if this join pushed the class over capacity, the latest joiner is rolled back.
  const roster = (await getActiveEnrollments(id)).sort((a, b) => a.id - b.id);
  const position = roster.findIndex(e => e.id === enrollmentId);
  if (position >= maxStudents) {
    await refundEnrollment({ id: enrollmentId, studentId: req.userId, creditsAmount: session.creditsAmount }, id, session.skill, "Class filled up before you joined", false);
    throw bad("This class just filled up. You were not charged.");
  }

  res.json({ success: true, message: "You're in! Credits are held in escrow until the class ends." });
}));

router.post("/:id/leave-group", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.isGroup !== 1) throw bad("Invalid group session");
  if (session.status === "in_progress") throw bad("You can't leave a class that's already in progress");
  if (session.status !== "accepted") throw bad("This class is no longer open");

  const [enrollment]: any[] = await db.select().from(groupEnrollmentsTable).where(and(
    eq(groupEnrollmentsTable.sessionId, id),
    eq(groupEnrollmentsTable.studentId, req.userId),
    eq(groupEnrollmentsTable.status, "active"),
  ));
  if (!enrollment) throw new HttpError(404, "You are not enrolled in this class");

  await refundEnrollment(enrollment, id, session.skill, `Left group session: ${session.skill}`, false);
  res.json({ success: true, message: "You left the class. Credits refunded." });
}));

router.post("/:id/start-group", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.mentorId !== req.userId || session.isGroup !== 1) throw new HttpError(403, "Unauthorized");
  if (session.status !== "accepted") throw bad("This class isn't ready to start");
  if (minsUntil(session.scheduledDate) > START_EARLY_MINUTES) {
    throw bad(`You can start this class ${START_EARLY_MINUTES} minutes before the scheduled time.`);
  }

  const enrolled = await getActiveEnrollments(id);
  if (enrolled.length === 0) throw bad("No students are enrolled yet");

  const ok = await claimSession(id, ["accepted"], { status: "in_progress", startedAt: new Date() });
  if (!ok) throw new HttpError(409, "Class was just updated. Refresh and try again");
  res.json({ success: true, message: `Class started with ${enrolled.length} student${enrolled.length === 1 ? "" : "s"}.`, meetLink: session.meetLink });
}));

router.post("/:id/end-group", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.mentorId !== req.userId || session.isGroup !== 1) throw new HttpError(403, "Unauthorized");
  if (session.status !== "in_progress" || !session.startedAt) throw bad("This class isn't in progress");

  const duration = session.duration || 60;
  const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 60000;
  const timePct = elapsed / duration;
  const enrollments = await getActiveEnrollments(id);

  if (timePct < AUTO_CANCEL_THRESHOLD) {
    const ok = await claimSession(id, ["in_progress"], { status: "cancelled", cancelReason: "Ended before 20% of the scheduled time." });
    if (!ok) throw new HttpError(409, "Class was already ended");
    for (const e of enrollments) await refundEnrollment(e, id, session.skill, "Mentor ended the class too early (auto-refund)");
    safe(() => notify.sessionCancelled(session.mentorId, session.skill, 0));
    throw bad("The class ended too early, so it was cancelled and every student was refunded.");
  }

  const { plans, total } = planSettlement(enrollments, () => timePct);
  const ok = await claimSession(id, ["in_progress"], {
    status: "pending_clearance", completedAt: new Date(), actualDuration: Math.round(elapsed), creditsAmount: total,
  });
  if (!ok) throw new HttpError(409, "Class was already ended");

  await applySettlement(id, plans, `Prorated group refund (${Math.round(Math.min(timePct, 1) * 100)}% of the class delivered)`);
  safe(() => notify.sessionCompleted(session.mentorId, session.skill, total));

  res.json({
    success: true,
    message: `Class ended. ${total} credits are held in escrow and clear in ${ESCROW_CLEARANCE_HOURS} hours.`,
  });
}));

router.get("/:id/group-members", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const session = await getSession(id);
  if (session.mentorId !== req.userId) throw new HttpError(403, "Unauthorized");

  const enrollments: any[] = await db.select().from(groupEnrollmentsTable).where(and(
    eq(groupEnrollmentsTable.sessionId, id),
    ne(groupEnrollmentsTable.status, "refunded"),
  ));
  if (enrollments.length === 0) return res.json([]);

  const students: any[] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
    .from(usersTable).where(inArray(usersTable.id, enrollments.map(e => e.studentId)));
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  res.json(enrollments.map(e => ({
    ...e,
    student: studentMap[e.studentId] || null,
    attendancePct: session.duration > 0 ? Math.min(1, (e.activeSeconds || 0) / 60 / session.duration) : 0,
  })));
}));

// ==============================================================
// MY SESSIONS
// ==============================================================
router.get("/", requireAuth, route(async (req, res) => {
  const role = req.query.role === "mentor" ? "mentor" : "student";
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50));

  const sessions: any[] = await db.select().from(sessionsTable)
    .where(role === "mentor" ? eq(sessionsTable.mentorId, req.userId) : eq(sessionsTable.studentId, req.userId))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(limit);
  if (sessions.length === 0) return res.json([]);

  const mentorIds = [...new Set(sessions.map(s => s.mentorId).filter(Boolean))] as number[];
  const studentIds = [...new Set(sessions.map(s => s.studentId).filter((x: number) => x > 0))] as number[];
  const groupIds = sessions.filter(s => s.isGroup === 1).map(s => s.id) as number[];

  const [mentors, students, groupRows]: [any[], any[], any[]] = await Promise.all([
    mentorIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating })
          .from(usersTable).where(inArray(usersTable.id, mentorIds))
      : Promise.resolve([]),
    studentIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
          .from(usersTable).where(inArray(usersTable.id, studentIds))
      : Promise.resolve([]),
    groupIds.length
      ? db.select({ sessionId: groupEnrollmentsTable.sessionId }).from(groupEnrollmentsTable).where(and(
          inArray(groupEnrollmentsTable.sessionId, groupIds),
          eq(groupEnrollmentsTable.status, "active"),
        ))
      : Promise.resolve([]),
  ]);

  const mentorMap = Object.fromEntries(mentors.map(m => [m.id, m]));
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const counts = new Map<number, number>();
  groupRows.forEach(r => counts.set(r.sessionId, (counts.get(r.sessionId) || 0) + 1));

  res.json(sessions.map(s => ({
    ...s,
    // Only the student sees the OTP, and only while it's still useful.
    sessionOtp: s.studentId === req.userId && ["requested", "accepted"].includes(s.status) ? s.sessionOtp : undefined,
    // Previously missing: mentors always saw "0 students" on their group classes.
    ...(s.isGroup === 1 ? { enrolledCount: counts.get(s.id) || 0 } : {}),
    mentor: mentorMap[s.mentorId] || null,
    student: studentMap[s.studentId] || null,
  })));
}));

// ==============================================================
// NEGOTIATION (mentors may only discount; students may only raise)
// ==============================================================
router.post("/:id/negotiate", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const price = Number(req.body?.proposedPrice);
  if (!Number.isInteger(price) || price < 1) throw bad("Enter a valid whole number of credits");
  if (price > MAX_CREDITS_PER_STUDENT) throw bad(`Maximum is ${MAX_CREDITS_PER_STUDENT} credits`);

  const session = await getSession(id);
  const isMentor = session.mentorId === req.userId;
  const isStudent = session.studentId === req.userId;
  if (!isMentor && !isStudent) throw new HttpError(403, "Unauthorized");
  if (session.isGroup === 1) throw bad("Group class prices can't be negotiated");
  if (session.status !== "requested") throw bad("You can only change the price of a pending request");

  const diff = price - session.creditsAmount;
  if (diff === 0) throw bad("That's already the current price");
  if (diff > 0 && isMentor) throw new HttpError(403, "Mentors can only offer a discount. Ask the student if they'd like to offer more.");
  if (diff < 0 && isStudent) throw new HttpError(403, "Only the mentor can offer a discount.");

  if (diff > 0 && !(await debitCredits(session.studentId, diff))) {
    throw bad(`You need ${diff} more credits for that offer`);
  }

  // Optimistic lock: only apply if the price and status haven't changed since we read them.
  const ok = await claimSession(id, ["requested"], { creditsAmount: price }, eq(sessionsTable.creditsAmount, session.creditsAmount));
  if (!ok) {
    if (diff > 0) await refundStudent(session.studentId, diff, id, "Price change was not applied");
    throw new HttpError(409, "This request was just updated. Refresh and try again");
  }

  if (diff > 0) await logTx(session.studentId, "escrow_hold", diff, "[ESCROW] Price increase", id);
  else await refundStudent(session.studentId, Math.abs(diff), id, "Price negotiation discount refund");

  res.json({ success: true, message: `Price updated to ${price} credits` });
}));

// ==============================================================
// RATING
// ==============================================================
router.post("/:id/rate", requireAuth, route(async (req, res) => {
  const id = parseId(req.params.id);
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad("Rating must be a whole number from 1 to 5");
  const review = String(req.body?.review ?? "").trim().slice(0, 500);
  if (review && !noHtml(review)) throw bad("Reviews can't contain HTML");

  const session = await getSession(id);
  let canRate = session.studentId === req.userId;
  if (!canRate && session.isGroup === 1) {
    const [enrollment]: any[] = await db.select().from(groupEnrollmentsTable).where(and(
      eq(groupEnrollmentsTable.sessionId, id),
      eq(groupEnrollmentsTable.studentId, req.userId),
    ));
    canRate = !!enrollment && ["completed", "pending_clearance"].includes(enrollment.status);
  }
  if (!canRate) throw new HttpError(403, "Only students who attended can rate");
  // Students can rate as soon as the session ends, no need to wait for escrow to clear.
  if (!["pending_clearance", "completed"].includes(session.status)) throw bad("You can rate once the session has ended");

  const ratingCol = (sessionsTable as any).teacherRating;
  const updated = await db.update(sessionsTable)
    .set({ teacherRating: rating, teacherReview: review || null } as any)
    .where(and(eq(sessionsTable.id, id), or(isNull(ratingCol), eq(ratingCol, 0)) as any))
    .returning({ id: sessionsTable.id });
  if (updated.length === 0) throw bad("This session has already been rated");

  const [agg]: any[] = await db.select({ avg: sql<number>`avg(${ratingCol})` }).from(sessionsTable)
    .where(and(eq(sessionsTable.mentorId, session.mentorId), gt(ratingCol, 0)));
  const newAvg = agg?.avg ? Math.round(Number(agg.avg) * 10) / 10 : rating;
  await db.update(usersTable).set({ averageRating: newAvg } as any).where(eq(usersTable.id, session.mentorId));

  res.json({ success: true, message: "Thanks, your review was saved." });
}));

// ==============================================================
// MAINTENANCE ENGINES (run on a schedule)
// ==============================================================

/** Releases escrow to mentors once the dispute window has passed. */
async function clearEscrow() {
  const threshold = new Date(Date.now() - ESCROW_CLEARANCE_HOURS * 3600000);
  const pending: any[] = await db.select().from(sessionsTable).where(and(
    eq(sessionsTable.status, "pending_clearance"),
    lte((sessionsTable as any).completedAt, threshold),
  )).limit(500);

  let clearedCount = 0, totalClearedAmt = 0, failed = 0;
  for (const session of pending) {
    // Claim first: a second cron run can never pay the same session twice.
    if (!(await claimSession(session.id, ["pending_clearance"], { status: "completed" }))) continue;

    let credited = false;
    try {
      const isMicro = !["standard", "extended"].includes(session.sessionType);
      const fee = Math.round(session.creditsAmount * PLATFORM_FEE_PCT);
      const earnings = session.creditsAmount - fee;

      if (earnings > 0) {
        await db.update(usersTable).set({
          credits: sql`${usersTable.credits} + ${earnings}`,
          sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1`,
          microSessionsCount: isMicro ? sql`${usersTable.microSessionsCount} + 1` : sql`${usersTable.microSessionsCount}`,
        } as any).where(eq(usersTable.id, session.mentorId));
        credited = true;
        await logTx(session.mentorId, "earned", earnings, `Cleared escrow: taught ${session.skill} (fee: ${fee} cr)`, session.id);
        totalClearedAmt += earnings;
      }

      if (session.isGroup === 1) {
        await db.update(groupEnrollmentsTable).set({ status: "completed" } as any).where(and(
          eq(groupEnrollmentsTable.sessionId, session.id),
          eq(groupEnrollmentsTable.status, "pending_clearance"),
        ));
      }
      clearedCount++;
    } catch (err) {
      failed++;
      console.error(`[CRON] clear-escrow failed for session ${session.id}`, err);
      // Only re-queue if the mentor was NOT already paid, otherwise it would pay twice.
      if (!credited) await claimSession(session.id, ["completed"], { status: "pending_clearance" });
      else console.error(`[CRON] session ${session.id} was paid but not fully logged: needs manual review`);
    }
  }
  return { clearedCount, totalClearedAmt, failed };
}

/** Refunds sessions nobody started, so credits are never locked forever. */
async function expireStale() {
  const now = Date.now();
  const graceMs = EXPIRY_GRACE_MINUTES * 60000;
  let expired = 0, expiredDoubts = 0;

  const candidates: any[] = await db.select().from(sessionsTable).where(and(
    inArray(sessionsTable.status as any, ["requested", "accepted"]),
    lte(sessionsTable.scheduledDate, new Date(now - graceMs)),
  )).limit(200);

  for (const s of candidates) {
    const endsAt = new Date(s.scheduledDate).getTime() + (s.duration || 60) * 60000 + graceMs;
    if (endsAt > now) continue;
    const ok = await claimSession(s.id, ["requested", "accepted"], {
      status: "cancelled", cancelReason: "Auto-cancelled: the scheduled time passed without the session starting.",
    });
    if (!ok) continue;

    if (s.isGroup === 1) {
      for (const e of await getActiveEnrollments(s.id)) await refundEnrollment(e, s.id, s.skill, `Class never started: ${s.skill}`);
    } else if (s.studentId && s.creditsAmount > 0) {
      await refundStudent(s.studentId, s.creditsAmount, s.id, `Session expired: ${s.skill}`);
      safe(() => notify.sessionCancelled(s.studentId, s.skill, s.creditsAmount));
    }
    if (s.mentorId) safe(() => notify.sessionCancelled(s.mentorId, s.skill, 0));
    expired++;
  }

  const doubts: any[] = await db.select().from(sessionsTable).where(and(
    eq(sessionsTable.sessionType, "doubt"),
    eq(sessionsTable.status, "pending"),
    lte(sessionsTable.createdAt, new Date(now - 24 * 3600000)),
  )).limit(200);
  for (const d of doubts) {
    if (!(await claimSession(d.id, ["pending"], { status: "cancelled", cancelReason: "Auto-cancelled: no mentor claimed this doubt in 24 hours." }))) continue;
    await refundStudent(d.studentId, d.creditsAmount, d.id, "Doubt expired without a mentor");
    safe(() => notify.sessionCancelled(d.studentId, d.skill, d.creditsAmount));
    expiredDoubts++;
  }
  return { expired, expiredDoubts };
}

/** Closes live sessions nobody ended, so mentors get paid and students keep dispute rights. */
async function autoCloseStale() {
  const now = Date.now();
  const live: any[] = await db.select().from(sessionsTable).where(eq(sessionsTable.status, "in_progress")).limit(200);
  let closed = 0;

  for (const s of live) {
    if (!s.startedAt) continue;
    const duration = s.duration || 60;
    const deadline = new Date(s.startedAt).getTime() + (duration + AUTO_CLOSE_GRACE_MINUTES) * 60000;
    if (deadline > now) continue;

    if (s.isGroup === 1) {
      // Nobody pressed "end": pay only for students with heartbeat evidence of attendance.
      const enrollments = await getActiveEnrollments(s.id);
      const { plans, total } = planSettlement(enrollments, e => Math.min(1, (e.activeSeconds || 0) / 60 / duration));
      const ok = await claimSession(s.id, ["in_progress"], {
        status: "pending_clearance", completedAt: new Date(), actualDuration: duration, creditsAmount: total,
      });
      if (!ok) continue;
      await applySettlement(s.id, plans, "Class closed automatically (attendance-based refund)");
      safe(() => notify.sessionCompleted(s.mentorId, s.skill, total));
    } else {
      // The student never pressed "done": release the full amount into escrow; they can still report a problem.
      const ok = await claimSession(s.id, ["in_progress"], { status: "pending_clearance", completedAt: new Date(), actualDuration: duration });
      if (!ok) continue;
      safe(() => notify.sessionCompleted(s.mentorId, s.skill, s.creditsAmount));
    }
    closed++;
  }
  return { closed };
}

function cronAuth(req: Request, res: Response, next: NextFunction) {
  if (!CRON_SECRET) return res.status(503).json({ error: "Cron is not configured" });
  const provided = Buffer.from(String(req.headers["x-cron-secret"] || ""));
  const expected = Buffer.from(CRON_SECRET);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    console.warn(`[CRON] Unauthorized attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/system/cron/clear-escrow", cronAuth, route(async (_req, res) => res.json({ success: true, ...(await clearEscrow()) })));
router.post("/system/cron/expire-stale", cronAuth, route(async (_req, res) => res.json({ success: true, ...(await expireStale()) })));
router.post("/system/cron/auto-close", cronAuth, route(async (_req, res) => res.json({ success: true, ...(await autoCloseStale()) })));
/** One call for your scheduler: close live sessions, expire dead ones, then clear escrow. */
router.post("/system/cron/run-all", cronAuth, route(async (_req, res) => {
  const autoClose = await autoCloseStale();
  const expire = await expireStale();
  const escrow = await clearEscrow();
  res.json({ success: true, autoClose, expire, escrow });
}));

export default router;
