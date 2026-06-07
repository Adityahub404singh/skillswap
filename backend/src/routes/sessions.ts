import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, or, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notify } from "../notify.js";
import { pgTable, serial, integer, text, timestamp, real, varchar, boolean } from "drizzle-orm/pg-core";

const sessionsTable = pgTable("sessions", {
  id:              serial("id").primaryKey(),
  mentorId:        integer("mentor_id").notNull(),
  studentId:       integer("student_id").notNull(),
  skill:           text("skill").notNull(),
  scheduledDate:   timestamp("scheduled_date").notNull(),
  duration:        integer("duration").notNull().default(60),
  status:          text("status").notNull().default("requested"),
  message:         text("message"),
  creditsAmount:   integer("credits_amount").notNull().default(10),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  meetLink:        text("meet_link"),
  startedAt:       timestamp("started_at"),
  completedAt:     timestamp("completed_at"),
  actualDuration:  integer("actual_duration"),
  isGroup:         integer("is_group").default(0),
  maxStudents:     integer("max_students").default(1),
  negotiatedPrice: integer("negotiated_price").default(0),
  sessionType:     varchar("session_type", { length: 20 }).notNull().default("standard"),
  cancelReason:    text("cancel_reason"),
  teacherRating:   real("teacher_rating"),
  learnerRating:   real("learner_rating"),
  teacherReview:   text("teacher_review"),
  learnerReview:   text("learner_review"),
  sessionOtp:      text("session_otp"),
});

const usersTable = pgTable("users", {
  id:                 serial("id").primaryKey(),
  name:               text("name").notNull(),
  email:              text("email").notNull(),
  passwordHash:       text("password_hash").notNull(),
  bio:                text("bio"),
  avatar:             text("avatar"),
  credits:            integer("credits").notNull().default(50),
  trustScore:         integer("trust_score").notNull().default(0),
  sessionsCompleted:  integer("sessions_completed").notNull().default(0),
  averageRating:      real("average_rating").notNull().default(0),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  pricePerHour:       integer("price_per_hour").notNull().default(10),
  currentStreak:      integer("current_streak").notNull().default(0),
  longestStreak:      integer("longest_streak").notNull().default(0),
  microSessionsCount: integer("micro_sessions_count").notNull().default(0),
  isPremium:          boolean("is_premium").notNull().default(false),
  referredBy:         integer("referred_by"),
});

const transactionsTable = pgTable("transactions", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  amount:      integer("amount").notNull(),
  type:        text("type").notNull(),
  description: text("description").notNull(),
  sessionId:   integer("session_id"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

const SESSION_CONFIG: Record<string, { duration: number; multiplier: number; label: string }> = {
  micro_15: { duration: 15, multiplier: 0.25, label: "15-min Quick Session" },
  micro_30: { duration: 30, multiplier: 0.50, label: "30-min Session" },
  doubt:    { duration: 20, multiplier: 0.33, label: "Doubt Solving" },
  standard: { duration: 60, multiplier: 1.00, label: "1-hour Session" },
  extended: { duration: 90, multiplier: 1.50, label: "1.5-hour Deep Dive" },
};

const router: IRouter = Router();

// GET /api/sessions/types
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// GET /api/sessions
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.query.role as string;
    let rows;

    if (role === "mentor") {
      rows = await db.select().from(sessionsTable).where(eq(sessionsTable.mentorId, req.userId!)).orderBy(desc(sessionsTable.scheduledDate));
    } else if (role === "student") {
      rows = await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, req.userId!)).orderBy(desc(sessionsTable.scheduledDate));
    } else {
      rows = await db.select().from(sessionsTable).where(or(eq(sessionsTable.mentorId, req.userId!), eq(sessionsTable.studentId, req.userId!))).orderBy(desc(sessionsTable.scheduledDate));
    }

    const enriched = await Promise.all(rows.map(async (session) => {
      const [mentor] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating }).from(usersTable).where(eq(usersTable.id, session.mentorId));
      const [student] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, session.studentId));
      return { ...session, mentor: mentor || null, student: student || null };
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const BookSchema = z.object({
  mentorId:      z.number(),
  skill:         z.string().min(1),
  sessionType:   z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledAt:   z.string().optional(),
  scheduledDate: z.string().optional(),
  message:       z.string().optional()
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = BookSchema.parse(req.body);
    const cfg  = SESSION_CONFIG[data.sessionType];

    if (data.mentorId === req.userId) return res.status(400).json({ error: "Cannot book session with yourself" });

    const [learner] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const [mentor]  = await db.select().from(usersTable).where(eq(usersTable.id, data.mentorId));

    if (!learner) return res.status(404).json({ error: "User not found" });
    if (!mentor)  return res.status(404).json({ error: "Mentor not found" });

    const baseRate = Math.max(mentor.pricePerHour, 10);
    const credits  = Math.max(Math.round(baseRate * cfg.multiplier), 3);

    if (learner.credits < credits) return res.status(400).json({ error: `Need ${credits} credits, you have ${learner.credits}` });

    const dateStr = data.scheduledDate || data.scheduledAt;
    if (!dateStr) return res.status(400).json({ error: "scheduledDate is required" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId:      data.mentorId,
      studentId:     req.userId!,
      skill:         data.skill,
      sessionType:   data.sessionType,
      scheduledDate: new Date(dateStr),
      duration:      cfg.duration,
      status:        "requested",
      creditsAmount: credits,
      sessionOtp:    Math.floor(100000 + Math.random() * 900000).toString(),
      message:       data.message ?? null,
    }).returning();

    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${credits}` }).where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "spent", amount: credits,
      description: `Booked ${cfg.label} for ${data.skill} with ${mentor.name}`,
      sessionId: session.id,
    });

    notify.sessionBooked(data.mentorId, learner.name, data.skill);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can accept" });

    await db.update(sessionsTable).set({ status: "accepted", meetLink: `https://meet.google.com/` + Math.random().toString(36).substring(2,5) + "-" + Math.random().toString(36).substring(2,6) + "-" + Math.random().toString(36).substring(2,5) }).where(eq(sessionsTable.id, sessionId));
    notify.sessionAccepted(session.studentId, req.userId!.toString(), session.skill);
    res.json({ success: true, message: "Session accepted! Learner will be notified." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only the student can release funds" });

    await db.update(sessionsTable).set({ status: "completed", completedAt: new Date() }).where(eq(sessionsTable.id, sessionId));

    const isMicro = session.sessionType !== "standard" && session.sessionType !== "extended";
    await db.update(usersTable).set({
      credits:            sql`${usersTable.credits} + ${session.creditsAmount}`,
      sessionsCompleted:  sql`${usersTable.sessionsCompleted} + 1`,
      microSessionsCount: isMicro ? sql`${usersTable.microSessionsCount} + 1` : sql`${usersTable.microSessionsCount}`,
    }).where(eq(usersTable.id, session.mentorId));

    await db.insert(transactionsTable).values({
      userId: session.mentorId, type: "earned", amount: session.creditsAmount,
      description: `Taught ${session.skill}`, sessionId: session.id,
    });

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId));
    if (student) {
      await db.update(usersTable).set({ sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, student.id));
      if (student.sessionsCompleted === 0 && student.referredBy) {
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 50` }).where(eq(usersTable.id, student.referredBy));
        await db.insert(transactionsTable).values({
          userId: student.referredBy, type: "referral", amount: 50,
          description: `Referral bonus from ${student.name}`, sessionId: session.id,
        });
      }
    }

    notify.sessionCompleted(session.mentorId, session.skill, session.creditsAmount);
    notify.sessionCompleted(session.studentId, session.skill, 0);
    res.json({ success: true, message: "Session completed! Credits transferred." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId   = parseInt(req.params.id as string);
    const cancelReason = req.body.reason ?? "Cancelled";
    const [session]   = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) return res.status(403).json({ error: "Not your session" });

    await db.update(sessionsTable).set({ status: "cancelled", cancelReason }).where(eq(sessionsTable.id, sessionId));
    await db.update(usersTable).set({ trustScore: sql`GREATEST(${usersTable.trustScore} - 5, 0)` }).where(eq(usersTable.id, req.userId!));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));

    await db.insert(transactionsTable).values({
      userId: session.studentId, type: "refund", amount: session.creditsAmount,
      description: `Refund - cancelled ${session.skill}`, sessionId: session.id,
    });

    res.json({ success: true, message: "Cancelled and refunded." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, scheduledDate, creditsAmount, maxStudents, message } = req.body;
    if (!skill || !scheduledDate) return res.status(400).json({ error: "skill and scheduledDate required" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId: req.userId!, studentId: req.userId!, skill,
      scheduledDate: new Date(scheduledDate), duration: 60, status: "accepted",
      creditsAmount: creditsAmount || 50, isGroup: 1,
      maxStudents: maxStudents || 10, message: message || null, sessionType: "standard",
    }).returning();

    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.isGroup !== 1) return res.status(400).json({ error: "Not a group session" });
    if (session.mentorId === req.userId) return res.status(400).json({ error: "You are the host" });

    const [learner] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (learner.credits < session.creditsAmount) return res.status(400).json({ error: "Insufficient credits" });

    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${session.creditsAmount}` }).where(eq(usersTable.id, req.userId!));

    const [newEnrolment] = await db.insert(sessionsTable).values({
      mentorId: session.mentorId, studentId: req.userId!, skill: session.skill,
      scheduledDate: session.scheduledDate, duration: session.duration,
      status: "accepted", creditsAmount: session.creditsAmount,
      isGroup: 1, maxStudents: session.maxStudents, meetLink: session.meetLink,
    }).returning();

    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "spent", amount: session.creditsAmount,
      description: `Joined group class: ${session.skill}`, sessionId: newEnrolment.id,
    });

    res.status(201).json({ success: true, message: "Successfully joined group session!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { rating, review } = req.body;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });

    await db.update(sessionsTable).set({ teacherRating: rating ?? 5, teacherReview: review ?? null }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/negotiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { proposedPrice } = req.body;
    if (!proposedPrice || proposedPrice < 5) return res.status(400).json({ error: "Invalid price" });

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only student can negotiate" });

    await db.update(sessionsTable).set({ negotiatedPrice: proposedPrice, status: "requested" }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, proposedPrice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/dispute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only the student can dispute" });
    if (session.status !== "accepted") return res.status(400).json({ error: "Can only dispute active sessions" });

    await db.update(sessionsTable).set({ status: "cancelled", cancelReason: req.body.reason || "Mentor No-Show (Disputed)" }).where(eq(sessionsTable.id, sessionId));
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));

    await db.insert(transactionsTable).values({
      userId: session.studentId, type: "refund", amount: session.creditsAmount,
      description: `Refund: Mentor No-Show for ${session.skill}`, sessionId: session.id,
    });

    await db.update(usersTable).set({ trustScore: sql`GREATEST(${usersTable.trustScore} - 10, 0)` }).where(eq(usersTable.id, session.mentorId));
    res.json({ success: true, message: "Dispute raised. Credits refunded and Mentor penalized." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { otp } = req.body;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only the mentor can start the session" });
    if (session.sessionOtp !== otp) return res.status(400).json({ error: "Galat OTP! Student se sahi code mangein." });

    await db.update(sessionsTable).set({ status: "in_progress", startedAt: new Date() }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, message: "OTP Verified! Session officially started." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;



