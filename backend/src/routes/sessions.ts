import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, or, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import {
  pgTable, serial, integer, text, timestamp,
  real, varchar, boolean
} from "drizzle-orm/pg-core";

// Exact DB column names
const sessionsTable = pgTable("sessions", {
  id:              serial("id").primaryKey(),
  mentorId:        integer("mentor_id").notNull(),
  studentId:       integer("student_id").notNull(),
  skill:           text("skill").notNull(),
  scheduledDate:   timestamp("scheduled_date").notNull(),
  duration:        integer("duration").notNull().default(60),
  status:          text("status").notNull().default("pending"),
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
  pricePerHour:       integer("price_per_hour").notNull().default(0),
  currentStreak:      integer("current_streak").notNull().default(0),
  longestStreak:      integer("longest_streak").notNull().default(0),
  microSessionsCount: integer("micro_sessions_count").notNull().default(0),
  isPremium:          boolean("is_premium").notNull().default(false),
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

const SESSION_CONFIG: Record<string, { duration: number; multiplier: number; label: string; minCredits: number }> = {
  micro_15: { duration: 15, multiplier: 0.25, label: "15-min Quick Session", minCredits: 3 },
  micro_30: { duration: 30, multiplier: 0.50, label: "30-min Session",       minCredits: 5 },
  doubt:    { duration: 20, multiplier: 0.33, label: "Doubt Solving",        minCredits: 4 },
  standard: { duration: 60, multiplier: 1.00, label: "1-hour Session",       minCredits: 10 },
  extended: { duration: 90, multiplier: 1.50, label: "1.5-hour Deep Dive",   minCredits: 15 },
};

// Calculate credits based on mentor hourly rate
function calcCredits(sessionType: string, mentorPricePerHour: number): number {
  const cfg = SESSION_CONFIG[sessionType];
  if (!cfg) return 10;
  const rate = Math.max(mentorPricePerHour || 10, 10);
  const calculated = Math.round(rate * cfg.multiplier);
  return Math.max(calculated, cfg.minCredits);
}

const router: IRouter = Router();

// GET /api/sessions/types
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// GET /api/sessions
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(
        or(
          eq(sessionsTable.mentorId, req.userId!),
          eq(sessionsTable.studentId, req.userId!)
        )
      )
      .orderBy(desc(sessionsTable.scheduledDate));
    res.json(rows);
  } catch (err: any) {
    console.error("[sessions/]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions
const BookSchema = z.object({
  mentorId:    z.number(),
  skill:       z.string().min(1),
  sessionType: z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledAt: z.string(),
  message:     z.string().optional(),
  meetLink:    z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = BookSchema.parse(req.body);
    const cfg  = SESSION_CONFIG[data.sessionType];

    if (data.mentorId === req.userId) {
      return res.status(400).json({ error: "Cannot book session with yourself" });
    }

    // Check learner credits
    const learners = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    const learner = learners[0];
    if (!learner) return res.status(404).json({ error: "User not found" });
    if (learner.credits < cfg.credits) {
      return res.status(400).json({ error: `Need ${cfg.credits} credits, you have ${learner.credits}` });
    }

    // Check mentor exists
    const mentors = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, data.mentorId));
    const mentor = mentors[0];
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    // Create session
    const [session] = await db
      .insert(sessionsTable)
      .values({
        mentorId:     data.mentorId,
        studentId:    req.userId!,
        skill:        data.skill,
        sessionType:  data.sessionType,
        scheduledDate: new Date(data.scheduledAt),
        duration:     cfg.duration,
        status:       "pending",
        creditsAmount: cfg.credits,
        meetLink:     data.meetLink ?? null,
        message:      data.message ?? null,
      })
      .returning();

    // Deduct credits
    await db
      .update(usersTable)
      .set({ credits: learner.credits - cfg.credits })
      .where(eq(usersTable.id, req.userId!));

    // Log transaction
    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        "spent",
      amount:      cfg.credits,
      description: `Booked ${cfg.label} for ${data.skill} with ${mentor.name}`,
      sessionId:   session.id,
    });

    res.status(201).json(session);
  } catch (err: any) {
    console.error("[sessions/book]", err.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/complete
router.patch("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));
    const session = sessions[0];
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    await db
      .update(sessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(sessionsTable.id, sessionId));

    // Pay mentor credits
    const mentors = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId));
    const mentor  = mentors[0];
    if (mentor) {
      const isMicro = session.sessionType !== "standard" && session.sessionType !== "extended";
      await db.update(usersTable).set({
        credits:            mentor.credits + session.creditsAmount,
        sessionsCompleted:  mentor.sessionsCompleted + 1,
        microSessionsCount: isMicro ? mentor.microSessionsCount + 1 : mentor.microSessionsCount,
      }).where(eq(usersTable.id, session.mentorId));

      await db.insert(transactionsTable).values({
        userId:      session.mentorId,
        type:        "earned",
        amount:      session.creditsAmount,
        description: `Taught ${session.skill} - ${SESSION_CONFIG[session.sessionType]?.label ?? "session"}`,
        sessionId:   session.id,
      });
    }

    res.json({ success: true, message: "Session completed! Credits transferred." });
  } catch (err: any) {
    console.error("[sessions/complete]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/cancel
router.patch("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId  = parseInt(req.params.id);
    const cancelReason = req.body.reason ?? "Cancelled by user";

    const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    const session  = sessions[0];
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    await db
      .update(sessionsTable)
      .set({ status: "cancelled", cancelReason })
      .where(eq(sessionsTable.id, sessionId));

    // Refund student
    const students = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId));
    const student  = students[0];
    if (student) {
      await db.update(usersTable)
        .set({ credits: student.credits + session.creditsAmount })
        .where(eq(usersTable.id, session.studentId));

      await db.insert(transactionsTable).values({
        userId:      session.studentId,
        type:        "earned",
        amount:      session.creditsAmount,
        description: `Refund - cancelled session (${session.skill})`,
        sessionId:   session.id,
      });
    }

    res.json({ success: true, message: "Session cancelled and credits refunded." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/rate
router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { score, review } = z.object({
      score:  z.number().min(1).max(5),
      review: z.string().max(500).optional(),
    }).parse(req.body);

    const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    const session  = sessions[0];
    if (!session) return res.status(404).json({ error: "Session not found" });

    const isStudent = session.studentId === req.userId;
    if (!isStudent && session.mentorId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    if (isStudent) {
      await db.update(sessionsTable)
        .set({ teacherRating: score, teacherReview: review ?? null })
        .where(eq(sessionsTable.id, sessionId));

      // Recalculate mentor avg rating
      const allSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.mentorId, session.mentorId));
      const ratings = allSessions
        .map(s => s.teacherRating)
        .filter((r): r is number => r !== null && r !== undefined);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        await db.update(usersTable)
          .set({ averageRating: Math.round(avg * 10) / 10 })
          .where(eq(usersTable.id, session.mentorId));
      }
    } else {
      await db.update(sessionsTable)
        .set({ learnerRating: score, learnerReview: review ?? null })
        .where(eq(sessionsTable.id, sessionId));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// â”€â”€ POST /api/sessions/group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GroupSchema = z.object({
  skill:         z.string().min(1),
  scheduledDate: z.string(),
  creditsAmount: z.number().int().min(1).default(20),
  maxStudents:   z.number().int().min(2).max(50).default(10),
  duration:      z.number().int().optional().default(60),
  meetLink:      z.string().optional(),
  message:       z.string().optional(),
});

router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = GroupSchema.parse(req.body);

    const mentors = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const mentor  = mentors[0];
    if (!mentor) return res.status(404).json({ error: "User not found" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId:      req.userId!,
      studentId:     req.userId!, // group sessions: creator is also host
      skill:         data.skill,
      scheduledDate: new Date(data.scheduledDate),
      duration:      data.duration ?? 60,
      status:        "pending",
      creditsAmount: data.creditsAmount,
      isGroup:       1,
      maxStudents:   data.maxStudents,
      sessionType:   "standard",
      meetLink:      data.meetLink ?? null,
      message:       data.message ?? null,
    }).returning();

    res.status(201).json({
      ...session,
      message: `Group session created for up to ${data.maxStudents} students`,
    });
  } catch (err: any) {
    console.error("[sessions/group]", err.message);
    res.status(400).json({ error: err.message });
  }
});

// â”€â”€ GET /api/sessions/group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/group", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.isGroup, 1))
      .orderBy(desc(sessionsTable.scheduledDate));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ POST /api/sessions/group/:id/join â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post("/group/:id/join", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const sessions  = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    const session   = sessions[0];

    if (!session)          return res.status(404).json({ error: "Group session not found" });
    if (!session.isGroup)  return res.status(400).json({ error: "Not a group session" });
    if (session.status !== "pending") return res.status(400).json({ error: "Session not joinable" });

    const learners = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const learner  = learners[0];
    if (!learner) return res.status(404).json({ error: "User not found" });
    if (learner.credits < session.creditsAmount) {
      return res.status(400).json({ error: `Need ${session.creditsAmount} credits, you have ${learner.credits}` });
    }

    // Deduct credits
    await db.update(usersTable)
      .set({ credits: learner.credits - session.creditsAmount })
      .where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        "spent",
      amount:      session.creditsAmount,
      description: `Joined group session: ${session.skill}`,
      sessionId:   session.id,
    });

    res.json({ success: true, message: "Joined group session successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/sessions/micro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns only micro sessions (15 or 30 min)
router.get("/micro", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(
        or(
          eq(sessionsTable.sessionType, "micro_15"),
          eq(sessionsTable.sessionType, "micro_30"),
          eq(sessionsTable.sessionType, "doubt")
        )
      )
      .orderBy(desc(sessionsTable.scheduledDate));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/sessions/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allSessions = await db
      .select()
      .from(sessionsTable)
      .where(
        or(
          eq(sessionsTable.mentorId, req.userId!),
          eq(sessionsTable.studentId, req.userId!)
        )
      );

    const completed  = allSessions.filter(s => s.status === "completed").length;
    const asMentor   = allSessions.filter(s => s.mentorId === req.userId && s.status === "completed").length;
    const asLearner  = allSessions.filter(s => s.studentId === req.userId && s.status === "completed").length;
    const microCount = allSessions.filter(s => ["micro_15","micro_30","doubt"].includes(s.sessionType ?? "")).length;
    const groupCount = allSessions.filter(s => s.isGroup === 1).length;

    res.json({ total: allSessions.length, completed, asMentor, asLearner, microCount, groupCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
export default router;
