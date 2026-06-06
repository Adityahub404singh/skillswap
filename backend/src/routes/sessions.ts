import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, or, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notify } from "../notify.js";
import {
  pgTable, serial, integer, text, timestamp,
  real, varchar, boolean
} from "drizzle-orm/pg-core";

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

const SESSION_CONFIG: Record<string, { duration: number; credits: number; label: string }> = {
  micro_15: { duration: 15, credits: 3,  label: "15-min Quick Session" },
  micro_30: { duration: 30, credits: 5,  label: "30-min Session" },
  doubt:    { duration: 20, credits: 4,  label: "Doubt Solving" },
  standard: { duration: 60, credits: 10, label: "1-hour Session" },
  extended: { duration: 90, credits: 15, label: "1.5-hour Deep Dive" },
};

const router: IRouter = Router();

// GET /api/sessions/types
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// GET /api/sessions?role=student|mentor
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = req.query.role as string;
    let rows;

    if (role === "mentor") {
      rows = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.mentorId, req.userId!))
        .orderBy(desc(sessionsTable.scheduledDate));
    } else if (role === "student") {
      rows = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.studentId, req.userId!))
        .orderBy(desc(sessionsTable.scheduledDate));
    } else {
      // Both
      rows = await db.select().from(sessionsTable)
        .where(or(
          eq(sessionsTable.mentorId, req.userId!),
          eq(sessionsTable.studentId, req.userId!)
        ))
        .orderBy(desc(sessionsTable.scheduledDate));
    }

    // Enrich with user data
    const enriched = await Promise.all(rows.map(async (session) => {
      const [mentor] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating })
        .from(usersTable).where(eq(usersTable.id, session.mentorId));
      const [student] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar })
        .from(usersTable).where(eq(usersTable.id, session.studentId));
      return {
        ...session,
        mentor: mentor || null,
        student: student || null,
      };
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error("[sessions/]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions
const BookSchema = z.object({
  mentorId:      z.number(),
  skill:         z.string().min(1),
  sessionType:   z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledAt:   z.string().optional(),
  scheduledDate: z.string().optional(),
  duration:      z.number().optional(),
  creditsAmount: z.number().optional(),
  message:       z.string().optional(),
  meetLink:      z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = BookSchema.parse(req.body);
    const cfg  = SESSION_CONFIG[data.sessionType];

    if (data.mentorId === req.userId) {
      return res.status(400).json({ error: "Cannot book session with yourself" });
    }

    const learners = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const learner  = learners[0];
    if (!learner) return res.status(404).json({ error: "User not found" });

    const credits = data.creditsAmount ?? cfg.credits;
    if (learner.credits < credits) {
      return res.status(400).json({ error: `Need ${credits} credits, you have ${learner.credits}` });
    }

    const mentors = await db.select().from(usersTable).where(eq(usersTable.id, data.mentorId));
    const mentor  = mentors[0];
    if (!mentor) return res.status(404).json({ error: "Mentor not found" });

    const dateStr = data.scheduledDate || data.scheduledAt;
    if (!dateStr) return res.status(400).json({ error: "scheduledDate is required" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId:      data.mentorId,
      studentId:     req.userId!,
      skill:         data.skill,
      sessionType:   data.sessionType,
      scheduledDate: new Date(dateStr),
      duration:      data.duration ?? cfg.duration,
      status:        "requested",
      creditsAmount: credits,
      meetLink:      data.meetLink ?? null,
      message:       data.message ?? null,
    }).returning();

    // Deduct credits
    await db.update(usersTable)
      .set({ credits: learner.credits - credits })
      .where(eq(usersTable.id, req.userId!));

    // Log transaction
    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        "spent",
      amount:      credits,
      description: `Booked ${cfg.label} for ${data.skill} with ${mentor.name}`,
      sessionId:   session.id,
    });

    res.status(201).json(session);
  } catch (err: any) {
    console.error("[sessions/book]", err.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/accept
router.post("/:id/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can accept" });

    await db.update(sessionsTable)
      .set({ status: "accepted" })
      .where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, message: "Session accepted!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/complete
router.post("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    await db.update(sessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(sessionsTable.id, sessionId));

    // Pay mentor
    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId));
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
        description: `Taught ${session.skill}`,
        sessionId:   session.id,
      });
    }

    notify.sessionCompleted(session.mentorId, session.skill, session.creditsAmount);
    notify.sessionCompleted(session.studentId, session.skill, 0);
    res.json({ success: true, message: "Session completed! Credits transferred." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/cancel
router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId   = parseInt(req.params.id as string);
    const cancelReason = req.body.reason ?? "Cancelled";
    const [session]   = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    await db.update(sessionsTable)
      .set({ status: "cancelled", cancelReason })
      .where(eq(sessionsTable.id, sessionId));

    // Refund student
    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId));
    if (student) {
      await db.update(usersTable)
        .set({ credits: student.credits + session.creditsAmount })
        .where(eq(usersTable.id, session.studentId));
      await db.insert(transactionsTable).values({
        userId:      session.studentId,
        type:        "earned",
        amount:      session.creditsAmount,
        description: `Refund - cancelled ${session.skill} session`,
        sessionId:   session.id,
      });
    }

    res.json({ success: true, message: "Cancelled and refunded." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/rate
router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { score, rating, review } = z.object({
      score:  z.number().min(1).max(5).optional(),
      rating: z.number().min(1).max(5).optional(),
      review: z.string().max(500).optional(),
    }).parse(req.body);

    const finalScore = score ?? rating ?? 5;
    const [session]  = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });

    const isStudent = session.studentId === req.userId;
    if (!isStudent && session.mentorId !== req.userId) {
      return res.status(403).json({ error: "Not your session" });
    }

    if (isStudent) {
      await db.update(sessionsTable)
        .set({ teacherRating: finalScore, teacherReview: review ?? null })
        .where(eq(sessionsTable.id, sessionId));

      const allSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.mentorId, session.mentorId));
      const ratings = allSessions.map(s => s.teacherRating).filter((r): r is number => r !== null && r !== undefined);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        await db.update(usersTable)
          .set({ averageRating: Math.round(avg * 10) / 10 })
          .where(eq(usersTable.id, session.mentorId));
      }
    } else {
      await db.update(sessionsTable)
        .set({ learnerRating: finalScore, learnerReview: review ?? null })
        .where(eq(sessionsTable.id, sessionId));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sessions/group
router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, scheduledDate, creditsAmount, maxStudents, message } = req.body;
    if (!skill || !scheduledDate) return res.status(400).json({ error: "skill and scheduledDate required" });

    const [session] = await db.insert(sessionsTable).values({
      mentorId:     req.userId!,
      studentId:    req.userId!,
      skill,
      scheduledDate: new Date(scheduledDate),
      duration:      60,
      status:        "requested",
      creditsAmount: creditsAmount || 50,
      isGroup:       1,
      maxStudents:   maxStudents || 10,
      message:       message || null,
      sessionType:   "standard",
    }).returning();

    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// POST /api/sessions/:id/negotiate
router.post("/:id/negotiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { proposedPrice } = req.body;
    if (!proposedPrice || proposedPrice < 5) {
      return res.status(400).json({ error: "Invalid price" });
    }
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.studentId !== req.userId) {
      return res.status(403).json({ error: "Only student can negotiate" });
    }
    await db.update(sessionsTable)
      .set({ negotiatedPrice: proposedPrice, status: "requested" })
      .where(eq(sessionsTable.id, sessionId));
    notify.creditsEarned(session.mentorId, 0, "Price negotiation request: " + proposedPrice + " credits proposed.");
    res.json({ success: true, proposedPrice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
export default router;
