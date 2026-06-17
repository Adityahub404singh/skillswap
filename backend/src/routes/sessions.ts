import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, or, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { notify } from "../notify.js";

// 🔥 Tables imported cleanly from schema
import { sessionsTable, usersTable, transactionsTable } from "../schema/index.js";

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
    
    // Sort by createdAt to ensure it doesn't crash on date column mismatch
    if (role === "mentor") {
      rows = await db.select().from(sessionsTable).where(eq(sessionsTable.mentorId, req.userId!)).orderBy(desc(sessionsTable.createdAt));
    } else if (role === "student") {
      rows = await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, req.userId!)).orderBy(desc(sessionsTable.createdAt));
    } else {
      rows = await db.select().from(sessionsTable).where(or(eq(sessionsTable.mentorId, req.userId!), eq(sessionsTable.studentId, req.userId!))).orderBy(desc(sessionsTable.createdAt));
    }

    const enriched = await Promise.all(rows.map(async (session: any) => {
      const [mentor] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar, averageRating: usersTable.averageRating }).from(usersTable).where(eq(usersTable.id, session.mentorId));
      const [student] = await db.select({ id: usersTable.id, name: usersTable.name, avatar: usersTable.avatar }).from(usersTable).where(eq(usersTable.id, session.studentId));
      return { ...session, mentor: mentor || null, student: student || null };
    }));
    res.json(enriched);
  } catch (err: any) { 
    console.error("GET /sessions error:", err);
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

    const baseRate = Math.max(mentor.pricePerHour || 10, 10);
    const credits  = Math.max(Math.round(baseRate * cfg.multiplier), 3);

    if (learner.credits < credits) return res.status(400).json({ error: `Need ${credits} credits, you have ${learner.credits}` });

    const dateStr = data.scheduledDate || data.scheduledAt;
    if (!dateStr) return res.status(400).json({ error: "scheduledDate is required" });

    const insertData: any = {
      mentorId:      data.mentorId,
      studentId:     req.userId!,
      skill:         data.skill,
      sessionType:   data.sessionType,
      duration:      cfg.duration,
      status:        "requested",
      creditsAmount: credits,
      message:       data.message ?? null,
      sessionOtp:    Math.floor(100000 + Math.random() * 900000).toString(),
    };
    
    // Safely mapping date field
    if ("scheduledDate" in sessionsTable) insertData.scheduledDate = new Date(dateStr);
    else insertData.scheduledAt = new Date(dateStr);

    const [session] = await db.insert(sessionsTable).values(insertData).returning();

    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${credits}` }).where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId: req.userId!, type: "spent", amount: credits,
      description: `Booked ${cfg.label} for ${data.skill} with ${mentor.name}`,
      sessionId: session.id,
    } as any);

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
    await db.update(sessionsTable).set({ status: "accepted", meetLink } as any).where(eq(sessionsTable.id, sessionId));
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
    
    if ((session as any).sessionOtp && (session as any).sessionOtp !== otp) {
        return res.status(400).json({ error: "Invalid OTP! Ask student for correct code." });
    }

    await db.update(sessionsTable).set({ status: "in_progress", startedAt: new Date() } as any).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true, message: "Session officially started!" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only the student can release funds" });

    const startedAt = (session as any).startedAt;
    if (session.status !== "in_progress" || !startedAt) {
      return res.status(400).json({ error: "Fraud Alert: Session must be started with OTP by the mentor first!" });
    }

    const duration = (session as any).duration || 60;
    const requiredMins = duration * 0.8;
    const elapsedMins = (new Date().getTime() - new Date(startedAt).getTime()) / 60000;
    
    if (elapsedMins < requiredMins) {
      return res.status(400).json({ 
        error: `Wait! Only ${Math.round(elapsedMins)} mins passed. You must complete at least ${Math.round(requiredMins)} mins before marking as done.` 
      });
    }

    await db.update(sessionsTable).set({ status: "completed", completedAt: new Date(), actualDuration: Math.round(elapsedMins) } as any).where(eq(sessionsTable.id, sessionId));

    const isMicro = (session as any).sessionType !== "standard" && (session as any).sessionType !== "extended";
    const platformFeePercent = 0.15;
    const platformFee = Math.round(session.creditsAmount * platformFeePercent);
    const mentorEarnings = session.creditsAmount - platformFee;

    await db.update(usersTable).set({
      credits:             sql`${usersTable.credits} + ${mentorEarnings}`,
      sessionsCompleted:   sql`${usersTable.sessionsCompleted} + 1`,
      microSessionsCount:  isMicro ? sql`${usersTable.microSessionsCount} + 1` : sql`${usersTable.microSessionsCount}`,
    } as any).where(eq(usersTable.id, session.mentorId));

    await db.insert(transactionsTable).values({
      userId: session.mentorId, type: "earned", amount: mentorEarnings,
      description: `Taught ${session.skill}`, sessionId: session.id,
    } as any);

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId));
    if (student && student.sessionsCompleted === 0 && (student as any).referredBy && duration >= 60 && elapsedMins >= 45) {
      await db.update(usersTable).set({ sessionsCompleted: sql`${usersTable.sessionsCompleted} + 1` }).where(eq(usersTable.id, student.id));
      await db.update(usersTable).set({ credits: sql`${usersTable.credits} + 50` }).where(eq(usersTable.id, (student as any).referredBy));
      await db.insert(transactionsTable).values({
        userId: (student as any).referredBy, type: "referral", amount: 50,
        description: `Referral bonus from ${student.name}`, sessionId: session.id,
      } as any);
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

    await db.update(sessionsTable).set({ status: "cancelled", cancelReason } as any).where(eq(sessionsTable.id, sessionId));
    
    if (session.status === "in_progress" && req.userId === session.studentId) {
       // Just cancel, no refund issued
    } else {
       await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
       await db.insert(transactionsTable).values({
         userId: session.studentId, type: "refund", amount: session.creditsAmount,
         description: `Refund - cancelled ${session.skill}`, sessionId: session.id,
       } as any);
    }
    res.json({ success: true, message: "Cancelled and refunded." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/dispute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const reason = req.body.reason?.trim();

    if (!reason || reason.length < 20) {
        return res.status(400).json({ error: "Dispute rejected. Please provide a detailed reason (at least 20 characters)." });
    }

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only student can dispute" });   
    if (session.status !== "in_progress" && session.status !== "accepted") {
        return res.status(400).json({ error: "Cannot dispute this session" });
    }

    await db.update(sessionsTable).set({ status: "disputed", cancelReason: reason } as any).where(eq(sessionsTable.id, sessionId));

    res.json({ success: true, message: "Dispute raised! Admin will review within 24 hours." });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/flash/post", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, message, creditsAmount } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (user.credits < creditsAmount) return res.status(400).json({ error: "Insufficient credits" });

    await db.update(usersTable).set({ credits: sql`${usersTable.credits} - ${creditsAmount}` }).where(eq(usersTable.id, req.userId!));

    const insertData: any = {
      studentId: req.userId!, mentorId: 0, skill, message, duration: 15, creditsAmount,
      sessionType: "doubt", status: "pending"
    };
    if ("scheduledDate" in sessionsTable) insertData.scheduledDate = new Date();
    else insertData.scheduledAt = new Date();

    const [doubt] = await db.insert(sessionsTable).values(insertData).returning();
    res.json(doubt);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/flash/board", requireAuth, async (req: AuthRequest, res) => {
  try {
    const doubts = await db.select().from(sessionsTable).where(eq(sessionsTable.status, "pending")).orderBy(desc(sessionsTable.createdAt));
    const enriched = await Promise.all(doubts.filter((d: any) => d.sessionType === "doubt" && d.mentorId === 0).map(async (d: any) => {
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
    await db.update(sessionsTable).set({ mentorId: req.userId!, status: "accepted", meetLink } as any).where(eq(sessionsTable.id, sessionId));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/rate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = parseInt(req.params.id as string);
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId) return res.status(403).json({ error: "Only the student can rate the mentor" });
    if (session.status !== "completed") return res.status(400).json({ error: "Can only rate completed sessions" });
    if ((session as any).teacherRating) return res.status(400).json({ error: "You have already rated this session" });

    await db.update(sessionsTable)
      .set({ teacherRating: rating, teacherReview: review } as any)
      .where(eq(sessionsTable.id, sessionId));

    const allMentorSessions = await db.select({ rating: (sessionsTable as any).teacherRating })
      .from(sessionsTable)
      .where(eq(sessionsTable.mentorId, session.mentorId));

    const ratedSessions = allMentorSessions.filter((s: any) => s.rating !== null && s.rating > 0);
    
    let newAvgRating = rating;
    if (ratedSessions.length > 0) {
      const sum = ratedSessions.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0);
      newAvgRating = Math.round((sum / ratedSessions.length) * 10) / 10;
    }

    await db.update(usersTable)
      .set({ averageRating: newAvgRating })
      .where(eq(usersTable.id, session.mentorId));

    res.json({ success: true, message: "Review saved successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;