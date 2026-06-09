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

router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

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
  } catch (err: any) { res.status(500).json({ error: err.message }); }
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
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can accept" });

    const meetLink = `https://meet.jit.si/SkillSwap_${sessionId}_${Date.now()}`;
    await db.update(sessionsTable).set({ status: "accepted", meetLink }).where(eq(sessionsTable.id, sessionId));
    notify.sessionAccepted(session.studentId, req.userId!.toString(), session.skill);
    res.json({ success: true, message: "Session accepted! Learner will be notified." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { otp } = req.body;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can start" });
    if (session.status !== "accepted") return res.status(400).json({ error: "Session must be accepted first" });
    if (session.sessionOtp !== otp) return res.status(400).json({ error: "Invalid OTP! Ask student for correct code." });

    await db.update(sessionsTable).set({ status: "in_progress", startedAt: new Date() }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, message: "Session officially started!" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only the student can release funds" });

    if (session.status !== "in_progress" || !session.startedAt) {
      return res.status(400).json({ error: "Fraud Alert: Session must be started with OTP by the mentor first!" });
    }

    const requiredMins = session.duration * 0.8;
    const elapsedMins = (new Date().getTime() - new Date(session.startedAt).getTime()) / 60000;
    
    if (elapsedMins < requiredMins) {
      return res.status(400).json({ 
        error: `Wait! Only ${Math.round(elapsedMins)} mins passed. You must complete at least ${Math.round(requiredMins)} mins before marking as done.` 
      });
    }

    await db.update(sessionsTable).set({ status: "completed", completedAt: new Date(), actualDuration: Math.round(elapsedMins) }).where(eq(sessionsTable.id, sessionId));

    const isMicro = session.sessionType !== "standard" && session.sessionType !== "extended";
    // 🛡️ FRAUD FIX & PLATFORM PROFIT: 15% Commission
    const platformFeePercent = 0.15;
    const platformFee = Math.round(session.creditsAmount * platformFeePercent);
    const mentorEarnings = session.creditsAmount - platformFee;

    await db.update(usersTable).set({
      credits:             sql`${usersTable.credits} + ${mentorEarnings}`,
      sessionsCompleted:   sql`${usersTable.sessionsCompleted} + 1`,
      microSessionsCount:  isMicro ? sql`${usersTable.microSessionsCount} + 1` : sql`${usersTable.microSessionsCount}`,
    }).where(eq(usersTable.id, session.mentorId));

    await db.insert(transactionsTable).values({
      userId: session.mentorId, type: "earned", amount: mentorEarnings,
      description: `Taught ${session.skill}`, sessionId: session.id,
    });

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId));
    if (student && student.sessionsCompleted === 0 && student.referredBy && session.duration >= 60 && elapsedMins >= 45) {
      await db.update(usersTable).set({ sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, student.id));
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 50` }).where(eq(usersTable.id, student.referredBy));
      await db.insert(transactionsTable).values({
        userId: student.referredBy, type: "referral", amount: 50,
        description: `Referral bonus from ${student.name}`, sessionId: session.id,
      });
    } else if (student) {
      await db.update(usersTable).set({ sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, student.id));
    }

    notify.sessionCompleted(session.mentorId, session.skill, session.creditsAmount);
    notify.sessionCompleted(session.studentId, session.skill, 0);
    res.json({ success: true, message: "Session completed! Credits transferred." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId   = parseInt(req.params.id as string);
    const cancelReason = req.body.reason ?? "Cancelled";
    const [session]   = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) return res.status(403).json({ error: "Not your session" });
    if (session.status === "cancelled") return res.status(400).json({ error: "Already cancelled" });

    await db.update(sessionsTable).set({ status: "cancelled", cancelReason }).where(eq(sessionsTable.id, sessionId));
    
    if (session.status === "in_progress" && req.userId === session.studentId) {
       // Just cancel, no refund issued
    } else {
       await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
       await db.insert(transactionsTable).values({
         userId: session.studentId, type: "refund", amount: session.creditsAmount,
         description: `Refund - cancelled ${session.skill}`, sessionId: session.id,
       });
    }
    res.json({ success: true, message: "Cancelled and refunded." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 🚨 FRAUD FIX: STRICT DISPUTE ROUTE (Requires Evidence/Reason)
router.post("/:id/dispute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const reason = req.body.reason?.trim();

    // Check for minimum 20 characters
    if (!reason || reason.length < 20) {
        return res.status(400).json({ 
            error: "Dispute rejected. Please provide a detailed reason (at least 20 characters) explaining what went wrong." 
        });
    }

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only student can dispute" });   
    if (session.status !== "in_progress" && session.status !== "accepted") {
        return res.status(400).json({ error: "Cannot dispute this session" });
    }

    await db.update(sessionsTable).set({ 
        status: "disputed", 
        cancelReason: reason 
    }).where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, message: "Dispute raised! Admin will review within 24 hours." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/flash/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, message, creditsAmount } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (user.credits < creditsAmount) return res.status(400).json({ error: "Insufficient credits" });

    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${creditsAmount}` }).where(eq(usersTable.id, req.userId!));

    const [doubt] = await db.insert(sessionsTable).values({
      studentId: req.userId!, mentorId: 0, skill, message, duration: 15, creditsAmount,
      sessionType: "doubt", status: "pending", scheduledDate: new Date()
    }).returning();
    res.json(doubt);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/flash/board", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doubts = await db.select().from(sessionsTable).where(eq(sessionsTable.status, "pending")).orderBy(desc(sessionsTable.createdAt));
    const enriched = await Promise.all(doubts.filter(d => d.sessionType === "doubt" && d.mentorId === 0).map(async (d) => {
      const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, d.studentId));
      return { ...d, student };
    }));
    res.json(enriched);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/claim-flash", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session || session.mentorId !== 0) return res.status(400).json({ error: "Already claimed" });
    if (session.studentId === req.userId) return res.status(400).json({ error: "Cannot claim own doubt" });

    const meetLink = `https://meet.jit.si/SkillSwapFlash_${sessionId}_${Date.now()}`;
    await db.update(sessionsTable).set({ mentorId: req.userId!, status: "accepted", meetLink }).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

