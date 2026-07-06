import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { desc, eq, sql, or, count } from "drizzle-orm";
import { usersTable, sessionsTable, transactionsTable, reportsTable } from "../schema/index.js";
import { notify } from "../notify.js";

const router: IRouter = Router();

// GET /api/admin/stats
// 🔥 FIX: SQL-level COUNT/SUM instead of fetching up to 500 rows and reducing in JS.
// 🆕 PHASE 1 DASHBOARD: activeToday, newToday, ongoingSessions, cancelledSessions,
// pendingWithdrawalsCount, totalWithdrawals — all from existing tables, no new schema.
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [
      [userCount], [sessionCount], [completedCount], [ongoingCount], [cancelledCount],
      [creditsSum], [activeTodayCount], [newTodayCount], [pendingWithdrawalsCount], recentUsers,
    ] = await Promise.all([
      db.select({ c: count() }).from(usersTable),
      db.select({ c: count() }).from(sessionsTable),
      db.select({ c: count() }).from(sessionsTable).where(eq(sessionsTable.status, "completed")),
      db.select({ c: count() }).from(sessionsTable).where(eq(sessionsTable.status, "in_progress")),
      db.select({ c: count() }).from(sessionsTable).where(eq(sessionsTable.status, "cancelled")),
      db.select({ s: sql<number>`COALESCE(SUM(${usersTable.credits}), 0)` }).from(usersTable),
      db.select({ c: count() }).from(usersTable).where(sql`${usersTable.lastActiveDate}::text >= to_char(CURRENT_DATE, 'YYYY-MM-DD')`),
      db.select({ c: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= CURRENT_DATE`),
      db.select({ c: count() }).from(transactionsTable).where(eq(transactionsTable.type, "withdrawal_pending")),
      db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(5),
    ]);

    const [sessionFeeSum] = await db.select({
      s: sql<number>`COALESCE(SUM(ROUND(${sessionsTable.creditsAmount} * 0.15)), 0)`,
    }).from(sessionsTable).where(eq(sessionsTable.status, "completed"));

    const [withdrawalFeeSum] = await db.select({
      s: sql<number>`COALESCE(SUM(ROUND(ABS(${transactionsTable.amount}) * 0.15)), 0)`,
    }).from(transactionsTable).where(sql`${transactionsTable.type} IN ('withdrawal_pending', 'withdrawal_completed')`);

    const [totalWithdrawalsSum] = await db.select({
      s: sql<number>`COALESCE(SUM(ABS(${transactionsTable.amount})), 0)`,
    }).from(transactionsTable).where(sql`${transactionsTable.type} IN ('withdrawal_pending', 'withdrawal_completed')`);

    res.json({
      totalUsers: userCount.c,
      totalSessions: sessionCount.c,
      completedSessions: completedCount.c,
      ongoingSessions: ongoingCount.c,
      cancelledSessions: cancelledCount.c,
      totalCreditsInSystem: Number(creditsSum.s),
      platformRevenue: Number(sessionFeeSum.s) + Number(withdrawalFeeSum.s),
      activeUsersToday: activeTodayCount.c,
      newUsersToday: newTodayCount.c,
      pendingWithdrawalsCount: pendingWithdrawalsCount.c,
      totalWithdrawals: Number(totalWithdrawalsSum.s),
      recentUsers,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100));
});

// GET /api/admin/sessions
router.get("/sessions", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(sessionsTable).orderBy(desc(sessionsTable.createdAt)).limit(100));
});

// GET /api/admin/transactions
router.get("/transactions", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(100));
});

// GET /api/admin/pending-withdrawals
router.get("/pending-withdrawals", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pending = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.type, "withdrawal_pending"))
      .orderBy(desc(transactionsTable.createdAt)).limit(100);

    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// GET /api/admin/user/:id/history
router.get("/user/:id/history", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);

    const [sessions, transactions] = await Promise.all([
      db.select().from(sessionsTable).where(or(eq(sessionsTable.mentorId, userId), eq(sessionsTable.studentId, userId))).orderBy(desc(sessionsTable.createdAt)),
      db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)),
    ]);

    res.json({ sessions, transactions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user history" });
  }
});

// POST /api/admin/users/:id/credits
// 🔥 FIX: Atomic SQL increment instead of read-then-write.
// Old version (`credits: user.credits + amount`) could silently lose a concurrent
// credit change (session payout, escrow clear, another admin action) that happened
// between the SELECT and the UPDATE.
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { amount, reason } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
    if (!existing) return res.status(404).json({ error: "User not found" });

    const [updated] = await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${amount}` })
      .where(eq(usersTable.id, userId))
      .returning({ credits: usersTable.credits });

    await db.insert(transactionsTable).values({
      userId, type: "bonus", amount,
      description: `Admin ID ${req.userId} ${amount >= 0 ? "added" : "deducted"} ${Math.abs(amount)} cr. Reason: ${reason || "Admin credit grant"}`,
    });

    res.json({ success: true, newBalance: updated.credits });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/sessions/:id/cancel
// 🔥 FIX: Previously only changed status, with NO refund to the student — credits
// would be permanently stuck in escrow. Now mirrors the refund_student path used
// by /sessions/:id/resolve, so this route is safe if anything ever calls it directly.
router.patch("/sessions/:id/cancel", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status === "completed" || session.status === "cancelled") {
      return res.status(400).json({ error: "Session already resolved" });
    }

    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` })
      .where(eq(usersTable.id, session.studentId));

    await db.insert(transactionsTable).values({
      userId: session.studentId, type: "refund", amount: session.creditsAmount,
      description: `Admin ID ${req.userId} cancelled & refunded session #${id}`,
    });

    await db.update(sessionsTable)
      .set({ status: "cancelled", cancelReason: "Admin cancelled & refunded." })
      .where(eq(sessionsTable.id, id));

    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.update(usersTable).set({ trustScore: -999 } as any).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User banned" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/transactions/:id/complete
// 🔥 FIX: Was setting type "withdrawal_complete" (typo) — a different string than
// "withdrawal_completed" used everywhere else (approve route, frontend status badges,
// audit log filter, wallet.ts unmatured-credits calc). Records marked via this route
// would silently disappear from the audit log and mismatch UI badges. Standardized.
router.patch("/transactions/:id/complete", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        await db.update(transactionsTable)
            .set({
              type: "withdrawal_completed",
              description: sql`${transactionsTable.description} || ' - PAID (by Admin ${req.userId})'`,
            })
            .where(eq(transactionsTable.id, txId));
        res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/users/:id/verify
router.patch("/users/:id/verify", requireAuth, requireAdmin, async (req, res) => {
  try {
      const userId = parseInt(req.params.id as string);
      const { isPremium } = req.body;
      // 🔥 FIX: Schema column is 'isPremiumUser', not 'isPremium'. The old code
      // silently updated nothing — the Verify button showed a success toast
      // but the DB value never changed.
      await db.update(usersTable).set({ isPremiumUser: isPremium } as any).where(eq(usersTable.id, userId));
      res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// APPROVE WITHDRAWAL ROUTE
router.post("/transactions/:id/approve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));

        if (!tx || tx.type !== "withdrawal_pending") {
            return res.status(400).json({ error: "Invalid or already processed transaction" });
        }

        await db.update(transactionsTable)
            .set({ type: "withdrawal_completed", description: `${tx.description} (Approved by Admin ID ${req.userId})` })
            .where(eq(transactionsTable.id, txId));

        res.json({ success: true, message: "Withdrawal approved" });
    } catch (err: any) {
        res.status(500).json({ error: "Server error" });
    }
});

// REJECT WITHDRAWAL & REFUND ROUTE
router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const txId = parseInt(req.params.id as string);
        const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId));
        if (!tx || tx.type !== "withdrawal_pending") return res.status(400).json({ error: "Invalid transaction" });

        const refundAmount = Math.abs(tx.amount);
        await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${refundAmount}` }).where(eq(usersTable.id, tx.userId));
        await db.update(transactionsTable).set({ type: "withdrawal_rejected", description: `${tx.description} (REJECTED & REFUNDED by Admin ID ${req.userId})` }).where(eq(transactionsTable.id, txId));
        res.json({ success: true, message: "Withdrawal rejected" });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

// RESOLVE DISPUTE / FORCE CANCEL SESSION
router.post("/sessions/:id/resolve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const sessionId = parseInt(req.params.id as string);
        const { action } = req.body;
        const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
        if (!session) return res.status(404).json({ error: "Session not found" });

        if (action === "refund_student") {
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` }).where(eq(usersTable.id, session.studentId));
            await db.insert(transactionsTable).values({ userId: session.studentId, type: "refund", amount: session.creditsAmount, description: `Admin ID ${req.userId} Refund for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "cancelled", cancelReason: "Admin force cancelled & refunded." }).where(eq(sessionsTable.id, sessionId));
        } else if (action === "pay_mentor") {
            const platformFee = Math.round(session.creditsAmount * 0.15);
            const mentorEarnings = session.creditsAmount - platformFee;
            await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${mentorEarnings}` }).where(eq(usersTable.id, session.mentorId));
            await db.insert(transactionsTable).values({ userId: session.mentorId, type: "earned", amount: mentorEarnings, description: `Admin ID ${req.userId} forced payment for session #${sessionId}` });
            await db.update(sessionsTable).set({ status: "completed", cancelReason: "Admin forced payment to mentor." }).where(eq(sessionsTable.id, sessionId));
        }
        res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: "Server error" }); }
});

// POST /api/admin/notifications/send  { title, message, targetGroup }
// targetGroup: "all" | "mentors" | "students"
router.post("/notifications/send", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, message, targetGroup } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ error: "title and message required" });

    let userIds: number[] = [];

    if (targetGroup === "all") {
      const rows = await db.select({ id: usersTable.id }).from(usersTable)
        .where(sql`${usersTable.trustScore} > -999`);
      userIds = rows.map(r => r.id);
    } else if (targetGroup === "mentors") {
      const rows = await db.selectDistinct({ id: sessionsTable.mentorId }).from(sessionsTable)
        .where(sql`${sessionsTable.mentorId} > 0`);
      userIds = [...new Set(rows.map(r => r.id))];
    } else if (targetGroup === "students") {
      const rows = await db.selectDistinct({ id: sessionsTable.studentId }).from(sessionsTable)
        .where(sql`${sessionsTable.studentId} > 0`);
      userIds = [...new Set(rows.map(r => r.id))];
    } else {
      return res.status(400).json({ error: "targetGroup must be all | mentors | students" });
    }

    if (userIds.length === 0) return res.json({ success: true, sentTo: 0 });

    // In-app notification + Gmail email via notify.adminBroadcast
    await Promise.all(
      userIds.map(userId => notify.adminBroadcast(userId, title.trim(), message.trim(), "/dashboard"))
    );

    // Audit log entry
    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        "bonus",
      amount:      0,
      description: `[ADMIN BROADCAST] "${title}" sent to ${userIds.length} ${targetGroup} users by Admin #${req.userId}`,
    } as any);

    console.log(`[ADMIN] Broadcast "${title}" → ${userIds.length} ${targetGroup} users`);
    res.json({ success: true, sentTo: userIds.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🔐 LOGIN AS USER (Admin impersonation)
// ══════════════════════════════════════════════════════════════
router.post("/users/:id/login-as", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const { signToken } = await import("../utils/jwt.js");
    const token = signToken({ userId: user.id, email: user.email || "" });

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "bonus",
      amount: 0,
      description: `[ADMIN] Admin #${req.userId} logged in as User #${userId}`,
    } as any);

    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🚫 SUSPEND / UNSUSPEND USER
// ══════════════════════════════════════════════════════════════
router.patch("/users/:id/suspend", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { suspend, reason } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable).set({
      isSuspended: !!suspend,
    } as any).where(eq(usersTable.id, userId));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "bonus",
      amount: 0,
      description: `[ADMIN] User #${userId} ${suspend ? "suspended" : "unsuspended"}. Reason: ${reason || "N/A"}`,
    } as any);

    res.json({ success: true, message: `User ${suspend ? "suspended" : "unsuspended"}` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🔑 ADMIN RESET USER PASSWORD
// ══════════════════════════════════════════════════════════════
router.post("/users/:id/reset-password", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be 6+ chars" });

    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash(newPassword, 10);

    await db.update(usersTable).set({ passwordHash: hash } as any).where(eq(usersTable.id, userId));

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "bonus",
      amount: 0,
      description: `[ADMIN] Password reset for User #${userId}`,
    } as any);

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 📊 ANALYTICS - Growth, Revenue, Sessions over time
// ══════════════════════════════════════════════════════════════
router.get("/analytics", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [userGrowth, sessionGrowth, revenueData, topMentors, topSkills] = await Promise.all([
      // Users per day (last 30 days)
      db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // Sessions per day (last 30 days)
      db.execute(sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM sessions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // Revenue per day (15% of completed sessions)
      db.execute(sql`
        SELECT DATE(created_at) as date,
               ROUND(SUM(credits_amount * 0.15)) as revenue
        FROM sessions
        WHERE status = 'completed'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // Top 10 mentors by sessions
      db.execute(sql`
        SELECT u.id, u.name, u.avatar, u.average_rating,
               COUNT(s.id) as session_count,
               ROUND(SUM(s.credits_amount * 0.85)) as total_earned
        FROM sessions s
        JOIN users u ON u.id = s.mentor_id
        WHERE s.status = 'completed'
        GROUP BY u.id, u.name, u.avatar, u.average_rating
        ORDER BY session_count DESC
        LIMIT 10
      `),
      // Top skills
      db.execute(sql`
        SELECT skill, COUNT(*) as count
        FROM sessions
        WHERE status = 'completed'
        GROUP BY skill
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);

    res.json({
      userGrowth:    userGrowth.rows,
      sessionGrowth: sessionGrowth.rows,
      revenueData:   revenueData.rows,
      topMentors:    topMentors.rows,
      topSkills:     topSkills.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ⚙️ PLATFORM SETTINGS (fee rates, welcome credits etc.)
// ══════════════════════════════════════════════════════════════
// In-memory settings (persist via env or DB later)
const platformSettings: Record<string, any> = {
  sessionFeePercent:    15,
  withdrawalFeePercent: 15,
  referralBonus:        50,
  welcomeCredits:       50,
  maintenanceMode:      false,
  minWithdrawal:        500,
  creditLockDays:       7,
};

router.get("/settings", requireAuth, requireAdmin, async (_req, res) => {
  res.json(platformSettings);
});

router.patch("/settings", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allowed = Object.keys(platformSettings);
    for (const key of Object.keys(req.body)) {
      if (allowed.includes(key)) platformSettings[key] = req.body[key];
    }
    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "bonus",
      amount: 0,
      description: `[ADMIN] Settings updated: ${JSON.stringify(req.body)}`,
    } as any);
    res.json({ success: true, settings: platformSettings });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🔍 GLOBAL SEARCH
// ══════════════════════════════════════════════════════════════
router.get("/search", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.json({ users: [], sessions: [], transactions: [] });

    const [users, sessions, transactions] = await Promise.all([
      db.execute(sql`
        SELECT id, name, email, credits, average_rating, created_at
        FROM users
        WHERE name ILIKE ${"%" + q + "%"} OR email ILIKE ${"%" + q + "%"}
        LIMIT 10
      `),
      db.execute(sql`
        SELECT s.id, s.skill, s.status, s.credits_amount, s.scheduled_date,
               u1.name as student_name, u2.name as mentor_name
        FROM sessions s
        JOIN users u1 ON u1.id = s.student_id
        JOIN users u2 ON u2.id = s.mentor_id
        WHERE s.skill ILIKE ${"%" + q + "%"}
           OR u1.name ILIKE ${"%" + q + "%"}
           OR u2.name ILIKE ${"%" + q + "%"}
        LIMIT 10
      `),
      db.execute(sql`
        SELECT t.id, t.type, t.amount, t.description, t.created_at, u.name
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        WHERE t.description ILIKE ${"%" + q + "%"} OR u.name ILIKE ${"%" + q + "%"}
        LIMIT 10
      `),
    ]);

    res.json({
      users:        users.rows,
      sessions:     sessions.rows,
      transactions: transactions.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 📋 REPORTS - Suspicious users, high refund rate
// ══════════════════════════════════════════════════════════════
router.get("/reports", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [highRefunds, newZeroActivity, topEarners] = await Promise.all([
      // Users with many cancelled sessions (possible abuse)
      db.execute(sql`
        SELECT u.id, u.name, u.email, COUNT(s.id) as cancelled_count
        FROM sessions s
        JOIN users u ON u.id = s.student_id
        WHERE s.status = 'cancelled'
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(s.id) >= 3
        ORDER BY cancelled_count DESC
        LIMIT 20
      `),
      // New users with 0 sessions (possible fake accounts)
      db.execute(sql`
        SELECT id, name, email, credits, created_at
        FROM users
        WHERE sessions_completed = 0
          AND created_at <= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 20
      `),
      // Top earners (mentor fraud check)
      db.execute(sql`
        SELECT u.id, u.name, u.email,
               COUNT(s.id) as sessions,
               SUM(s.credits_amount * 0.85) as earned
        FROM sessions s
        JOIN users u ON u.id = s.mentor_id
        WHERE s.status = 'completed'
        GROUP BY u.id, u.name, u.email
        ORDER BY earned DESC
        LIMIT 10
      `),
    ]);

    res.json({
      highRefundUsers:   highRefunds.rows,
      inactiveNewUsers:  newZeroActivity.rows,
      topEarners:        topEarners.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// 🚩 USER-SUBMITTED REPORTS (mentor-profile.tsx ka Report button)
// /admin/reports (upar wala) se ALAG hai — woh heuristic fraud detection hai
// ══════════════════════════════════════════════════════════════
router.get("/user-reports", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const allReports = await db.select().from(reportsTable)
      .orderBy(desc(reportsTable.createdAt))
      .limit(200);

    const userIds = [...new Set(allReports.flatMap(r => [r.reporterId, r.reportedUserId]))];
    const allUsers = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
          .from(usersTable)
      : [];
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    res.json(allReports.map(r => ({
      ...r,
      reporterName:  userMap.get(r.reporterId)?.name  || `User #${r.reporterId}`,
      reportedName:  userMap.get(r.reportedUserId)?.name  || `User #${r.reportedUserId}`,
      reportedEmail: userMap.get(r.reportedUserId)?.email || null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user reports" });
  }
});

router.patch("/user-reports/:id/resolve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Use 'reviewed' or 'dismissed'" });
    }
    await db.update(reportsTable).set({ status } as any).where(eq(reportsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;