import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, or, desc, sql, and, inArray, gte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notify } from "../notify.js";
import {
  sessionsTable,
  usersTable,
  transactionsTable,
  groupEnrollmentsTable,
} from "../schema/index.js";

// ══════════════════════════════════════════════════════════════
// 🏢 INDUSTRY LEVEL CONFIGURATION & CONSTANTS
// ══════════════════════════════════════════════════════════════
const SESSION_CONFIG: Record<string, { duration: number; multiplier: number; label: string }> = {
  micro_15: { duration: 15, multiplier: 0.25, label: "15-min Quick Session" },
  micro_30: { duration: 30, multiplier: 0.50, label: "30-min Session" },
  doubt:    { duration: 20, multiplier: 0.33, label: "Doubt Solving" },
  standard: { duration: 60, multiplier: 1.00, label: "1-hour Session" },
  extended: { duration: 90, multiplier: 1.50, label: "1.5-hour Deep Dive" },
};

// 🛡️ TRUST & SAFETY CONSTANTS (ANTI-FRAUD)
const PLATFORM_FEE_PCT         = 0.15; // 15% Platform Cut
const HEARTBEAT_TIMEOUT_SECS   = 90;   // Disconnect threshold for evidence
const ESCROW_CLEARANCE_HOURS   = 24;   // Funds hold time for disputes

// ⏱️ TIME & PRORATION THRESHOLDS
const MVT_THRESHOLD            = 0.80; // >80% time = 100% Payout
const AUTO_CANCEL_THRESHOLD    = 0.20; // <20% time = Auto-Cancel (No Payout to Mentor)
const MAX_SESSIONS_PER_WEEK    = 3;    // Prevent Collusion (Money Laundering via fake sessions)

// 🛡️ GROUP SESSION CAPS (Prevent platform drain)
const MAX_STUDENTS_CAP         = 50;   // No unrealistic 9999 capacity sessions
const MAX_CREDITS_PER_STUDENT  = 500;  // No unrealistic pricing

// 🔒 CRON SECRET — set CRON_SECRET in .env, default only for local dev
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret-change-in-prod";

const router: IRouter = Router();

// ══════════════════════════════════════════════════════════════
// 🛠️ CORE UTILITY ENGINES (DO NOT TOUCH)
// ══════════════════════════════════════════════════════════════

/** Returns active enrollments for a group session */
async function getEnrollmentCount(sessionId: number) {
  return await db.select().from(groupEnrollmentsTable).where(and(
    eq(groupEnrollmentsTable.sessionId, sessionId),
    eq(groupEnrollmentsTable.status, "active")
  ));
}

/** Processes strict refunds with immutable transaction logging */
async function refundStudent(studentId: number, amount: number, sessionId: number, reason: string) {
  if (amount <= 0) return;
  
  // 1. Credit wallet back
  await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} + ${amount}` })
    .where(eq(usersTable.id, studentId));
    
  // 2. Immutably log refund
  await db.insert(transactionsTable).values({
    userId: studentId, 
    type: "refund", 
    amount,
    description: `[REFUND] ${reason}`, 
    sessionId,
  } as any);
}

/** 🛡️ ANTI-FRAUD: Prevents two users from doing endless fake sessions */
async function checkVelocityAndCollusion(studentId: number, mentorId: number) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = await db.select().from(sessionsTable).where(
    and(
      eq(sessionsTable.studentId, studentId),
      eq(sessionsTable.mentorId, mentorId),
      gte(sessionsTable.createdAt, oneWeekAgo)
    )
  );
  
  if (recentSessions.length >= MAX_SESSIONS_PER_WEEK) {
    throw new Error(`Anti-Fraud: You can only have ${MAX_SESSIONS_PER_WEEK} sessions with the same mentor per week.`);
  }
}

// ══════════════════════════════════════════════════════════════
// 🚀 ROUTE: TYPES & DISCOVERY
// ══════════════════════════════════════════════════════════════
router.get("/types", (_req, res) => res.json(SESSION_CONFIG));

// ══════════════════════════════════════════════════════════════
// 👥 GROUP SESSION ENGINE (CREATION & BROWSE)
// ══════════════════════════════════════════════════════════════

// Mentor: Create Group
router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, scheduledDate, creditsAmount, maxStudents, message, sessionType } = req.body;

    if (!skill?.trim()) return res.status(400).json({ error: "Skill is required" });
    if (!scheduledDate)  return res.status(400).json({ error: "Date is required" });
    if (!creditsAmount || creditsAmount < 1) return res.status(400).json({ error: "Credits per student required (min 1)" });

    // 🛡️ ANTI-FRAUD: Cap validation — prevents platform drain attacks
    const parsedCredits = parseInt(creditsAmount);
    const parsedMaxStudents = parseInt(maxStudents) || 10;

    if (parsedCredits > MAX_CREDITS_PER_STUDENT) {
      return res.status(400).json({ error: `Max ${MAX_CREDITS_PER_STUDENT} credits per student allowed` });
    }
    if (parsedMaxStudents > MAX_STUDENTS_CAP) {
      return res.status(400).json({ error: `Max ${MAX_STUDENTS_CAP} students per group allowed` });
    }
    if (parsedMaxStudents < 2) {
      return res.status(400).json({ error: "Group sessions need at least 2 student slots" });
    }

    const scheduledAt = new Date(scheduledDate);
    if (scheduledAt <= new Date()) return res.status(400).json({ error: "Cannot schedule in the past" });

    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!mentor) return res.status(404).json({ error: "User not found" });

    const cfg = SESSION_CONFIG[sessionType || "standard"] || SESSION_CONFIG.standard;
    const meetLink = `https://meet.jit.si/SkillSwapGroup_${req.userId}_${Date.now()}`;

    const [session] = await db.insert(sessionsTable).values({
      mentorId:      req.userId!,
      studentId:     0,
      skill:         skill.trim(),
      sessionType:   sessionType || "standard",
      duration:      cfg.duration,
      status:        "accepted", // Auto-accepted for groups
      creditsAmount: parsedCredits,
      message:       message?.trim() || null,
      meetLink,
      isGroup:       1,
      maxStudents:   parsedMaxStudents,
      sessionOtp:    Math.floor(100000 + Math.random() * 900000).toString(),
      scheduledDate: scheduledAt,
    } as any).returning();

    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Student: Browse Groups
router.get("/group/browse", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allGroup = await db.select().from(sessionsTable)
      .where(and(
        eq(sessionsTable.isGroup as any, 1),
        or(eq(sessionsTable.status, "accepted"), eq(sessionsTable.status, "in_progress")) as any
      ))
      .orderBy(desc(sessionsTable.scheduledDate))
      .limit(50);

    const enriched = await Promise.all(allGroup.map(async (session: any) => {
      const enrollments = await db.select().from(groupEnrollmentsTable).where(and(
        eq(groupEnrollmentsTable.sessionId, session.id),
        eq(groupEnrollmentsTable.status, "active")
      ));

      const [myEnrollment] = enrollments.filter(e => e.studentId === req.userId);
      const enrolledCount  = enrollments.length;
      const spotsLeft      = (session.maxStudents || 10) - enrolledCount;
      
      let isMyHeartbeatActive = false;
      if (myEnrollment?.lastHeartbeatAt) {
        const secsSince = (Date.now() - new Date(myEnrollment.lastHeartbeatAt).getTime()) / 1000;
        isMyHeartbeatActive = secsSince < HEARTBEAT_TIMEOUT_SECS;
      }

      const [mentor] = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        avatar: usersTable.avatar,
        averageRating: usersTable.averageRating,
      }).from(usersTable).where(eq(usersTable.id, session.mentorId));

      return {
        ...session,
        sessionOtp:         undefined, // Security Rule: NEVER expose OTP
        enrolledCount,
        spotsLeft,
        isEnrolled:         !!myEnrollment,
        isOwnSession:       session.mentorId === req.userId, // 🛡️ Frontend ke liye flag
        isFull:             spotsLeft <= 0 && !myEnrollment,
        isMyHeartbeatActive,
        myActiveSeconds:    myEnrollment?.activeSeconds || 0,
        mentor:             mentor || null,
      };
    }));

    res.json(enriched);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 🔥 FIXED: Missing route — frontend /group/my-enrollments call karta tha jo exist hi nahi karta tha
// "My Groups" tab isliye hamesha empty dikhta tha
router.get("/group/my-enrollments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const enrollments = await db.select().from(groupEnrollmentsTable)
      .where(and(
        eq(groupEnrollmentsTable.studentId, req.userId!),
        or(
          eq(groupEnrollmentsTable.status, "active"),
          eq(groupEnrollmentsTable.status, "pending_clearance"),
          eq(groupEnrollmentsTable.status, "completed"),
        )
      ))
      .orderBy(desc(groupEnrollmentsTable.createdAt))
      .limit(30);

    if (enrollments.length === 0) return res.json([]);

    const sessionIds = [...new Set(enrollments.map(e => e.sessionId))];
    const sessions = await db.select().from(sessionsTable)
      .where(inArray(sessionsTable.id, sessionIds));

    const enriched = await Promise.all(sessions.map(async (session: any) => {
      const myEnrollment = enrollments.find(e => e.sessionId === session.id);
      const activeEnrollments = await getEnrollmentCount(session.id);
      const [mentor] = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        avatar: usersTable.avatar,
        averageRating: usersTable.averageRating,
      }).from(usersTable).where(eq(usersTable.id, session.mentorId));

      return {
        ...session,
        sessionOtp:     undefined,
        enrolledCount:  activeEnrollments.length,
        isEnrolled:     true,
        enrollmentStatus: myEnrollment?.status,
        creditsLocked:  myEnrollment?.creditsAmount || 0,
        mentor:         mentor || null,
      };
    }));

    res.json(enriched);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ⚡ FLASH BOARD & DOUBTS (AS IS)
// ══════════════════════════════════════════════════════════════
router.post("/flash/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, message, creditsAmount } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (user.credits < creditsAmount) return res.status(400).json({ error: "Insufficient credits" });

    // Deduct Escrow
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${creditsAmount}` }).where(eq(usersTable.id, req.userId!));

    const [doubt] = await db.insert(sessionsTable).values({
      studentId: req.userId!, mentorId: 0, skill, message, duration: 15, creditsAmount,
      sessionType: "doubt", status: "pending", scheduledDate: new Date(),
    } as any).returning();
    res.json(doubt);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/claim-flash", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session || session.mentorId !== 0) return res.status(400).json({ error: "Already claimed" });
    if (session.studentId === req.userId)    return res.status(400).json({ error: "Cannot claim own doubt" });

    const meetLink = `https://meet.jit.si/SkillSwapFlash_${sessionId}_${Date.now()}`;
    await db.update(sessionsTable).set({ mentorId: req.userId!, status: "accepted", meetLink } as any).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🎯 1-ON-1 BOOKING & ESCROW CREATION
// ══════════════════════════════════════════════════════════════
const BookSchema = z.object({
  mentorId:      z.number().int(),
  skill:         z.string().min(1).max(50).trim().refine(v => !/<[^>]*>/i.test(v), { message: "No HTML" }),
  sessionType:   z.enum(["micro_15", "micro_30", "doubt", "standard", "extended"]).default("standard"),
  scheduledDate: z.string().optional(),
  scheduledAt:   z.string().optional(),
  message:       z.string().max(500).optional().nullable(),
})
.refine(d => Boolean(d.scheduledDate || d.scheduledAt), { message: "scheduledDate required", path: ["scheduledDate"] })
.refine(d => {
  const raw = d.scheduledDate || d.scheduledAt;
  return raw ? new Date(raw) > new Date() : true;
}, { message: "Cannot schedule in the past", path: ["scheduledDate"] });

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = BookSchema.parse(req.body);
    const cfg  = SESSION_CONFIG[data.sessionType];

    if (data.mentorId === req.userId) return res.status(400).json({ error: "Cannot book session with yourself" });

    // 🛡️ ANTI-FRAUD: Velocity Check
    await checkVelocityAndCollusion(req.userId!, data.mentorId);

    const [learner] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    const [mentor]  = await db.select().from(usersTable).where(eq(usersTable.id, data.mentorId));

    if (!learner) return res.status(404).json({ error: "User not found" });
    if (!mentor)  return res.status(404).json({ error: "Mentor not found" });

    const baseRate = Math.max(mentor.pricePerHour || 10, 10);
    const credits  = Math.max(Math.round(baseRate * cfg.multiplier), 3);

    if (learner.credits < credits) return res.status(400).json({ error: `Need ${credits} credits, you have ${learner.credits}` });

    const dateStr = data.scheduledDate || data.scheduledAt;

    // 1. Create Session
    const [session] = await db.insert(sessionsTable).values({
      mentorId:      data.mentorId,
      studentId:     req.userId!,
      skill:         data.skill,
      sessionType:   data.sessionType,
      duration:      cfg.duration,
      status:        "requested",
      creditsAmount: credits,
      message:       data.message ?? null,
      sessionOtp:    Math.floor(100000 + Math.random() * 900000).toString(),
      scheduledDate: new Date(dateStr!),
    } as any).returning();

    // 2. Lock Funds in Escrow (Deduct from Student)
    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${credits}` }).where(eq(usersTable.id, req.userId!));
    
    // 3. Log as Escrow Hold
    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "escrow_hold", amount: credits,
      description: `[ESCROW] Locked for ${cfg.label} with ${mentor.name}`, sessionId: session.id,
    } as any);

    notify.sessionBooked(data.mentorId, learner.name, data.skill);
    res.status(201).json(session);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🚦 SESSION LIFECYCLE (START, HEARTBEAT)
// ══════════════════════════════════════════════════════════════
router.post("/:id/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can accept" });

    const meetLink = `https://meet.jit.si/SkillSwap_${sessionId}_${Date.now()}`;
    await db.update(sessionsTable).set({ status: "accepted", meetLink } as any).where(eq(sessionsTable.id, sessionId));
    notify.sessionAccepted(session.studentId, req.userId!.toString(), session.skill);
    res.json({ success: true, meetLink });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { otp }   = req.body;
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can start" });
    if (session.status !== "accepted")   return res.status(400).json({ error: "Session must be accepted first" });
    if ((session as any).isGroup === 1)  return res.status(400).json({ error: "Use /start-group for group sessions" });
    if ((session as any).sessionOtp && (session as any).sessionOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP! Ask student for the correct code." });
    }

    await db.update(sessionsTable).set({ status: "in_progress", startedAt: new Date() } as any).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, message: "Session started securely!" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/heartbeat", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.status !== "in_progress") return res.status(400).json({ error: "Session not active" });

    const isStudent = session.studentId === req.userId;
    const isMentor  = session.mentorId  === req.userId;
    const isGroup   = (session as any).isGroup === 1;

    if (isGroup) {
      // Group heartbeat: update enrollment record
      const [enrollment] = await db.select().from(groupEnrollmentsTable).where(and(
        eq(groupEnrollmentsTable.sessionId, sessionId),
        eq(groupEnrollmentsTable.studentId, req.userId!)
      ));

      if (enrollment) {
        await db.update(groupEnrollmentsTable).set({
          lastHeartbeatAt: new Date(),
          activeSeconds: sql`${groupEnrollmentsTable.activeSeconds} + 60`,
          isConnected: 1,
        } as any).where(eq(groupEnrollmentsTable.id, enrollment.id));
      }
    } else {
      if (!isStudent && !isMentor) return res.status(403).json({ error: "Unauthorized" });
      // 1-on-1: just acknowledge
    }

    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🔚 1-ON-1 COMPLETE
// ══════════════════════════════════════════════════════════════
// 🔥 FIX: Ye route pehle missing tha — frontend ka completeMut (useCompleteSession)
// koi bhi matching endpoint nahi pa raha tha, isliye mentors kabhi 1-on-1 session
// complete hi nahi kar paate the aur payment escrow me fasa reh jaata tha.
router.post("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session) return res.status(404).json({ error: "Not found" });
    if ((session as any).isGroup === 1) return res.status(400).json({ error: "Use /end-group for group sessions" });
    if (session.mentorId !== req.userId) return res.status(403).json({ error: "Only mentor can complete" });
    if (session.status !== "in_progress") return res.status(400).json({ error: "Session not in progress" });

    const startedAt    = (session as any).startedAt;
    const durationMins  = (session as any).duration || 60;
    const elapsedMins   = (Date.now() - new Date(startedAt).getTime()) / 60000;
    const timePct       = Math.min(elapsedMins / durationMins, 1);

    // 🔥 FRAUD GUARD: Mentor ended way too early — full refund to student, no payout
    if (timePct < AUTO_CANCEL_THRESHOLD) {
      await refundStudent(session.studentId, session.creditsAmount, sessionId, "Mentor ended session too early (Auto-Refund)");
      await db.update(sessionsTable).set({ status: "cancelled", cancelReason: "Ended under 20% limit." } as any).where(eq(sessionsTable.id, sessionId));
      return res.status(400).json({ error: "Session ended too early. Auto-cancelled & student refunded." });
    }

    // Prorated payout: < 80% delivery = partial refund to student, mentor gets prorated amount
    let finalPayout = session.creditsAmount;
    if (timePct < MVT_THRESHOLD) {
      finalPayout = Math.floor(session.creditsAmount * timePct);
      const refundAmt = session.creditsAmount - finalPayout;
      if (refundAmt > 0) {
        await refundStudent(session.studentId, refundAmt, sessionId, `Prorated Refund (${Math.round(timePct * 100)}% delivery)`);
      }
    }

    await db.update(sessionsTable).set({
      status: "pending_clearance",
      completedAt: new Date(),
      actualDuration: Math.round(elapsedMins),
      creditsAmount: finalPayout,
    } as any).where(eq(sessionsTable.id, sessionId));

    res.json({
      success: true,
      message: `Session completed! ${finalPayout} credits placed in escrow for ${ESCROW_CLEARANCE_HOURS} hours.`,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 👥 GROUP SESSION COMPLETE
// ══════════════════════════════════════════════════════════════
router.post("/:id/end-group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session || session.mentorId !== req.userId) return res.status(403).json({ error: "Unauthorized" });
    if (session.status !== "in_progress") return res.status(400).json({ error: "Session not in progress" });

    const startedAt = (session as any).startedAt;
    const durationMins = (session as any).duration || 60;
    const elapsedMins = (Date.now() - new Date(startedAt).getTime()) / 60000;
    
    // Mentor ka overall session time % (Safety cap)
    const mentorTimePct = Math.min(elapsedMins / durationMins, 1);

    // 🔥 FRAUD GUARD: Mentor exits too early (Whole group auto-refunded)
    if (mentorTimePct < AUTO_CANCEL_THRESHOLD) {
      const enrollments = await getEnrollmentCount(sessionId);
      for (const e of enrollments) {
        await refundStudent(e.studentId, e.creditsAmount, sessionId, "Mentor ended group too early (Auto-Refund)");
        await db.update(groupEnrollmentsTable).set({ status: "refunded" } as any).where(eq(groupEnrollmentsTable.id, e.id));
      }
      await db.update(sessionsTable).set({ status: "cancelled", cancelReason: "Ended under 20% limit." } as any).where(eq(sessionsTable.id, sessionId));
      return res.status(400).json({ error: "Session ended too early. Auto-cancelled & all students refunded." });
    }

    const enrollments = await getEnrollmentCount(sessionId);
    let totalPendingForMentor = 0;

    for (const enrollment of enrollments) {
      // 🔥 PER-STUDENT FRAUD GUARD: Student kitni der active tha?
      const studentActiveMins = enrollment.activeSeconds / 60;
      const studentTimePct = Math.min(studentActiveMins / durationMins, 1);

      // Agar student 20% se kam time active tha, uska paisa wapas karo
      if (studentTimePct < AUTO_CANCEL_THRESHOLD) {
        await refundStudent(enrollment.studentId, enrollment.creditsAmount, sessionId, "Ghost student (Insufficient activity)");
        await db.update(groupEnrollmentsTable).set({ status: "refunded" } as any).where(eq(groupEnrollmentsTable.id, enrollment.id));
        continue; // Payout nahi milega
      }

      // Final payout: Individual student activity vs Mentor's delivery (Jo kam ho)
      const effectivePct = Math.min(studentTimePct, mentorTimePct);
      let finalPayout = Math.floor(enrollment.creditsAmount * effectivePct);
      const refundAmt = enrollment.creditsAmount - finalPayout;

      if (refundAmt > 0) {
        await refundStudent(enrollment.studentId, refundAmt, sessionId, `Prorated Group Refund (${Math.round(effectivePct * 100)}% delivery)`);
      }

      totalPendingForMentor += finalPayout;
      await db.update(groupEnrollmentsTable).set({ 
        status: "pending_clearance", 
        completedAt: new Date(),
      } as any).where(eq(groupEnrollmentsTable.id, enrollment.id));
    }

    await db.update(sessionsTable).set({
      status: "pending_clearance", 
      completedAt: new Date(), 
      actualDuration: Math.round(elapsedMins),
      creditsAmount: totalPendingForMentor,
    } as any).where(eq(sessionsTable.id, sessionId));

    res.json({
      success: true,
      message: `Group session ended! ${totalPendingForMentor} credits placed in escrow.`,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🛑 DISPUTES & CANCELLATIONS
// ══════════════════════════════════════════════════════════════
router.post("/:id/dispute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const reason    = req.body.reason?.trim();
    if (!reason || reason.length < 20) return res.status(400).json({ error: "Provide detailed reason (min 20 chars)" });

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only student can dispute" });

    const allowed = ["requested", "accepted", "in_progress", "pending_clearance"];
    if (!allowed.includes(session.status)) return res.status(400).json({ error: `Cannot dispute status "${session.status}". Funds may have already cleared.` });

    await db.update(sessionsTable).set({ status: "disputed", cancelReason: `[DISPUTED] ${reason}` } as any).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, message: "Dispute raised! Funds are frozen. Admin will review logs." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId   = parseInt(req.params.id as string);
    const cancelReason = req.body.reason ?? "Cancelled";
    const [session]   = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.mentorId !== req.userId && session.studentId !== req.userId) return res.status(403).json({ error: "Not your session" });
    if (["cancelled", "completed", "pending_clearance"].includes(session.status)) return res.status(400).json({ error: "Cannot cancel anymore" });

    await db.update(sessionsTable).set({ status: "cancelled", cancelReason } as any).where(eq(sessionsTable.id, sessionId));

    if ((session as any).isGroup === 1) {
      const enrollments = await db.select().from(groupEnrollmentsTable).where(and(
        eq(groupEnrollmentsTable.sessionId, sessionId),
        eq(groupEnrollmentsTable.status, "active")
      ));
      for (const e of enrollments) {
        await refundStudent(e.studentId, e.creditsAmount, sessionId, `Group cancelled: ${session.skill}`);
        await db.update(groupEnrollmentsTable).set({ status: "refunded", refundAmount: e.creditsAmount, refundedAt: new Date() } as any).where(eq(groupEnrollmentsTable.id, e.id));
      }
    } else {
      if (session.studentId && session.creditsAmount > 0) {
        await refundStudent(session.studentId, session.creditsAmount, sessionId, `Cancelled: ${session.skill}`);
      }
    }

    res.json({ success: true, message: "Cancelled and refunded." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 👥 GROUP SPECIFIC ENDPOINTS (JOIN, START, COMPLETE)
// ══════════════════════════════════════════════════════════════
router.post("/:id/join-group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session || (session as any).isGroup !== 1) return res.status(400).json({ error: "Invalid group session" });
    if (session.status !== "accepted") return res.status(400).json({ error: "Not open for enrollment" });

    // 🛡️ ANTI-FRAUD #1: Mentor apna khud ka group join nahi kar sakta (self-credit exploit)
    if (session.mentorId === req.userId) {
      return res.status(400).json({ error: "Mentors cannot join their own group session" });
    }

    const [existing] = await db.select().from(groupEnrollmentsTable).where(and(
      eq(groupEnrollmentsTable.sessionId, sessionId),
      eq(groupEnrollmentsTable.studentId, req.userId!)
    ));
    if (existing?.status === "active") return res.status(400).json({ error: "Already enrolled in this session" });

    // 🛡️ ANTI-FRAUD #2: Capacity check — real-time se dobara check, race conditions prevent karo
    const activeEnrollments = await getEnrollmentCount(sessionId);
    const maxStudents = (session as any).maxStudents || 10;
    if (activeEnrollments.length >= maxStudents) {
      return res.status(400).json({ error: "Session is full. No spots remaining." });
    }

    // 🛡️ ANTI-FRAUD #3: Collusion check — same mentor ke sath same week mein too many sessions
    await checkVelocityAndCollusion(req.userId!, session.mentorId);

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!student) return res.status(404).json({ error: "User not found" });
    if (student.credits < session.creditsAmount) {
      return res.status(400).json({ error: `Need ${session.creditsAmount} credits, you have ${student.credits}` });
    }

    // Escrow Lock
    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} - ${session.creditsAmount}` })
      .where(eq(usersTable.id, req.userId!));
    
    if (existing) {
      await db.update(groupEnrollmentsTable).set({
        status: "active",
        creditsAmount: session.creditsAmount,
        activeSeconds: 0,
        lastHeartbeatAt: null,
        isConnected: 0,
      } as any).where(eq(groupEnrollmentsTable.id, existing.id));
    } else {
      await db.insert(groupEnrollmentsTable).values({
        sessionId,
        studentId: req.userId!,
        creditsAmount: session.creditsAmount,
        status: "active",
      } as any);
    }

    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "escrow_hold", amount: session.creditsAmount,
      description: `[ESCROW] Joined group: ${session.skill}`, sessionId,
    } as any);

    res.json({ success: true, message: "Joined successfully! Credits locked in escrow." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/start-group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));

    if (!session || session.mentorId !== req.userId)  return res.status(403).json({ error: "Unauthorized" });
    if (session.status !== "accepted")    return res.status(400).json({ error: "Session not in accepted state" });

    const enrollments = await getEnrollmentCount(sessionId);
    if (enrollments.length === 0) return res.status(400).json({ error: "No students enrolled yet." });

    await db.update(sessionsTable)
      .set({ status: "in_progress", startedAt: new Date() } as any)
      .where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, meetLink: (session as any).meetLink });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 🔥 FIX: Student leave-group endpoint pehle missing tha — frontend ka
// leaveGroupSession() hamesha 404 pe fail ho raha tha. Sirf "active" enrollment
// waala student leave kar sakta hai, tabhi tak jab session shuru nahi hua hai
// (started ke baad chhodna refund-fraud ka rasta khol dega).
router.post("/:id/leave-group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session || (session as any).isGroup !== 1) return res.status(400).json({ error: "Invalid group session" });

    const [enrollment] = await db.select().from(groupEnrollmentsTable).where(and(
      eq(groupEnrollmentsTable.sessionId, sessionId),
      eq(groupEnrollmentsTable.studentId, req.userId!),
      eq(groupEnrollmentsTable.status, "active")
    ));
    if (!enrollment) return res.status(400).json({ error: "You are not actively enrolled in this session" });

    if (session.status === "in_progress" || session.status === "pending_clearance" || session.status === "completed") {
      return res.status(400).json({ error: "Cannot leave — session already started or finished. Use dispute instead." });
    }

    await refundStudent(req.userId!, enrollment.creditsAmount, sessionId, `Left group before start: ${session.skill}`);
    await db.update(groupEnrollmentsTable).set({
      status: "refunded", refundAmount: enrollment.creditsAmount, refundedAt: new Date(),
    } as any).where(eq(groupEnrollmentsTable.id, enrollment.id));

    res.json({ success: true, message: "Left the group. Credits refunded." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 📋 GET MY SESSIONS
// ══════════════════════════════════════════════════════════════
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const role = (req.query.role as string) || "student";
    const sessions = await db.select().from(sessionsTable)
      .where(
        role === "mentor"
          ? eq(sessionsTable.mentorId, req.userId!)
          : eq(sessionsTable.studentId, req.userId!)
      )
      .orderBy(desc(sessionsTable.createdAt))
      .limit(50);

    // Never expose OTP in list
    const safe = sessions.map((s: any) => ({ ...s, sessionOtp: undefined }));
    res.json(safe);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 💰 THE CLEARANCE ENGINE (CALL THIS VIA CRON JOB)
// ══════════════════════════════════════════════════════════════
/**
 * 🔒 PROTECTED: Requires X-Cron-Secret header matching CRON_SECRET env var.
 * Call this from cronJobs.ts every hour.
 * Finds all sessions in "pending_clearance" past 24h and pays mentor.
 */
router.post("/system/cron/clear-escrow", async (req, res) => {
  // 🛡️ ANTI-FRAUD: Cron endpoint protection — previously unprotected, anyone could trigger payouts
  const providedSecret = req.headers["x-cron-secret"] as string;
  if (!providedSecret || providedSecret !== CRON_SECRET) {
    console.warn(`[CRON] Unauthorized clear-escrow attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const clearanceThreshold = new Date(Date.now() - ESCROW_CLEARANCE_HOURS * 60 * 60 * 1000);

    const pendingSessions = await db.select().from(sessionsTable).where(
      and(
        eq(sessionsTable.status, "pending_clearance"),
        sql`${sessionsTable.completedAt} <= ${clearanceThreshold.toISOString()}`
      )
    );

    let clearedCount = 0;
    let totalClearedAmt = 0;

    for (const session of pendingSessions) {
      const isMicro = !["standard", "extended"].includes((session as any).sessionType);
      const platformFee = Math.round(session.creditsAmount * PLATFORM_FEE_PCT);
      const mentorEarnings = session.creditsAmount - platformFee;

      if (mentorEarnings > 0) {
        await db.update(usersTable).set({
          credits:            sql`${usersTable.credits} + ${mentorEarnings}`,
          sessionsCompleted:  sql`${usersTable.sessionsCompleted} + 1`,
          microSessionsCount: isMicro ? sql`${usersTable.microSessionsCount} + 1` : sql`${usersTable.microSessionsCount}`,
        } as any).where(eq(usersTable.id, session.mentorId));

        await db.insert(transactionsTable).values({
          userId: session.mentorId, type: "earned", amount: mentorEarnings,
          description: `Cleared Escrow: Taught ${session.skill} (Fee: ${platformFee} cr)`, sessionId: session.id,
        } as any);

        totalClearedAmt += mentorEarnings;
      }

      await db.update(sessionsTable).set({ status: "completed" } as any).where(eq(sessionsTable.id, session.id));
      
      if ((session as any).isGroup === 1) {
        await db.update(groupEnrollmentsTable).set({ status: "completed" } as any).where(and(
          eq(groupEnrollmentsTable.sessionId, session.id),
          eq(groupEnrollmentsTable.status, "pending_clearance")
        ));
      }
      
      clearedCount++;
    }

    console.log(`[ESCROW CRON] Cleared ${clearedCount} sessions. Total paid: ${totalClearedAmt} cr.`);
    res.json({ success: true, clearedCount, totalClearedAmt });
  } catch (err: any) { 
    console.error("[ESCROW CRON ERROR]", err);
    res.status(500).json({ error: err.message }); 
  }
});

// ══════════════════════════════════════════════════════════════
// ⭐ RATING
// ══════════════════════════════════════════════════════════════
router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId   = parseInt(req.params.id as string);
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });

    const isGroup = (session as any).isGroup === 1;
    let canRate = session.studentId === req.userId;
    if (isGroup && !canRate) {
      const [enrollment] = await db.select().from(groupEnrollmentsTable).where(and(
        eq(groupEnrollmentsTable.sessionId, sessionId),
        eq(groupEnrollmentsTable.studentId, req.userId!)
      ));
      canRate = !!enrollment && ["completed", "pending_clearance"].includes(enrollment.status);
    }

    if (!canRate) return res.status(403).json({ error: "Only enrolled students can rate" });
    if (!["completed", "pending_clearance"].includes(session.status)) return res.status(400).json({ error: "Session must be done to rate" });
    if ((session as any).teacherRating) return res.status(400).json({ error: "Already rated" });

    await db.update(sessionsTable).set({ teacherRating: rating, teacherReview: review } as any).where(eq(sessionsTable.id, sessionId));

    const allRated = await db.select({ rating: (sessionsTable as any).teacherRating }).from(sessionsTable).where(eq(sessionsTable.mentorId, session.mentorId));
    const ratedOnes = allRated.filter((s: any) => s.rating > 0);
    const newAvg = ratedOnes.length > 0
      ? Math.round((ratedOnes.reduce((a: number, c: any) => a + c.rating, 0) / ratedOnes.length) * 10) / 10
      : rating;
    await db.update(usersTable).set({ averageRating: newAvg }).where(eq(usersTable.id, session.mentorId));

    res.json({ success: true, message: "Review saved!" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;