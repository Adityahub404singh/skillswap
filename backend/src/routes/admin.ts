import { Router, type IRouter, type Response } from "express";
import { db } from "../db.js";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middlewares/auth.js";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  usersTable,
  sessionsTable,
  transactionsTable,
  reportsTable,
} from "../schema/index.js";
import { notify } from "../notify.js";

const router: IRouter = Router();

// -----------------------------------------------------------------------------
// SkillSwap Admin API
// -----------------------------------------------------------------------------
// This router intentionally uses only tables/columns present in the supplied
// project schemas: users, sessions, transactions and reports. It does not
// pretend that a bank payout, durable settings store, or audit-log table exists.
// Mount this router at /api/admin.
// -----------------------------------------------------------------------------

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const MAX_CREDIT_ADJUSTMENT = 100_000;
const MAX_BALANCE = 2_147_483_647;
const ADMIN_FEE_PERCENT = 15;
const NOTIFICATION_BATCH_SIZE = 5;
const NOTIFICATION_BATCH_DELAY_MS = 400;

const publicUserColumns = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  bio: usersTable.bio,
  avatar: usersTable.avatar,
  location: usersTable.location,
  credits: usersTable.credits,
  earnedBalance: usersTable.earnedBalance,
  trustScore: usersTable.trustScore,
  sessionsCompleted: usersTable.sessionsCompleted,
  averageRating: usersTable.averageRating,
  isAdmin: usersTable.isAdmin,
  isEmailVerifiedStatus: usersTable.isEmailVerifiedStatus,
  isPhoneVerifiedStatus: usersTable.isPhoneVerifiedStatus,
  isPremiumUser: usersTable.isPremiumUser,
  premiumExpiresAt: usersTable.premiumExpiresAt,
  isSuspended: usersTable.isSuspended,
  createdAt: usersTable.createdAt,
};

const platformSettings: Record<string, number | boolean> = {
  sessionFeePercent: 15,
  withdrawalFeePercent: 15,
  referralBonus: 50,
  welcomeCredits: 50,
  maintenanceMode: false,
  minWithdrawal: 500,
  creditLockDays: 7,
};

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function pageParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInteger(query.page, 1));
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInteger(query.limit, DEFAULT_PAGE_SIZE)),
  );
  return { page, limit, offset: (page - 1) * limit };
}

function safeError(error: unknown): string {
  console.error("[ADMIN API ERROR]", error);
  return "Internal server error";
}

function textValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function sendBadRequest(res: Response, message: string) {
  return res.status(400).json({ success: false, error: message });
}

function sendNotFound(res: Response, message = "Record not found") {
  return res.status(404).json({ success: false, error: message });
}

function sendConflict(res: Response, message: string) {
  return res.status(409).json({ success: false, error: message });
}

function paginationResponse(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

function adminId(req: AuthRequest): number {
  return Number(req.userId || 0);
}

function requireValidId(value: unknown, res: Response, label: string) {
  const id = positiveId(value);
  if (!id) {
    sendBadRequest(res, `Invalid ${label}`);
    return null;
  }
  return id;
}

async function writeAdminLedgerEntry(
  userId: number,
  type: string,
  description: string,
  amount = 0,
) {
  await db.insert(transactionsTable).values({
    userId,
    type,
    amount,
    description: description.slice(0, 1000),
  });
}

async function notifySafely(
  userId: number,
  title: string,
  message: string,
  actionUrl = "/dashboard",
) {
  try {
    await notify.adminBroadcast(userId, title, message, actionUrl);
  } catch (error) {
    // Notification delivery must never roll back a completed wallet operation.
    console.error(`[ADMIN NOTIFY] Failed for user ${userId}`, error);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function paginatedUsers(page: number, limit: number, offset: number) {
  const [users, [{ total }]] = await Promise.all([
    db.select(publicUserColumns)
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(usersTable),
  ]);
  return { users, pagination: paginationResponse(page, limit, Number(total)) };
}

// -----------------------------------------------------------------------------
// 1. Dashboard statistics
// GET /api/admin/stats
// -----------------------------------------------------------------------------

router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [
      [userCount],
      [sessionCount],
      [completedCount],
      [ongoingCount],
      [cancelledCount],
      [requestedCount],
      [disputedCount],
      [creditsSum],
      [activeTodayCount],
      [newTodayCount],
      [pendingWithdrawalsCount],
      [totalWithdrawalsSum],
      recentUsers,
    ] = await Promise.all([
      db.select({ c: count() }).from(usersTable),
      db.select({ c: count() }).from(sessionsTable),
      db.select({ c: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "completed")),
      db.select({ c: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "in_progress")),
      db.select({ c: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "cancelled")),
      db.select({ c: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "requested")),
      db.select({ c: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "disputed")),
      db.select({ s: sql<number>`COALESCE(SUM(${usersTable.credits}), 0)` })
        .from(usersTable),
      db.select({ c: count() }).from(usersTable)
        .where(sql`${usersTable.lastActiveDate}::text >= to_char(CURRENT_DATE, 'YYYY-MM-DD')`),
      db.select({ c: count() }).from(usersTable)
        .where(sql`${usersTable.createdAt} >= CURRENT_DATE`),
      db.select({ c: count() }).from(transactionsTable)
        .where(eq(transactionsTable.type, "withdrawal_pending")),
      db.select({ s: sql<number>`COALESCE(SUM(ABS(${transactionsTable.amount})), 0)` })
        .from(transactionsTable)
        .where(sql`${transactionsTable.type} IN ('withdrawal_pending', 'withdrawal_completed')`),
      db.select(publicUserColumns).from(usersTable)
        .orderBy(desc(usersTable.createdAt)).limit(5),
    ]);

    const [sessionFeeSum] = await db.select({
      s: sql<number>`COALESCE(SUM(ROUND(${sessionsTable.creditsAmount} * ${ADMIN_FEE_PERCENT} / 100.0)), 0)`,
    }).from(sessionsTable).where(eq(sessionsTable.status, "completed"));

    const [withdrawalFeeSum] = await db.select({
      s: sql<number>`COALESCE(SUM(ROUND(ABS(${transactionsTable.amount}) * ${ADMIN_FEE_PERCENT} / 100.0)), 0)`,
    }).from(transactionsTable)
      .where(eq(transactionsTable.type, "withdrawal_completed"));

    return res.json({
      success: true,
      totalUsers: Number(userCount.c),
      totalSessions: Number(sessionCount.c),
      completedSessions: Number(completedCount.c),
      ongoingSessions: Number(ongoingCount.c),
      cancelledSessions: Number(cancelledCount.c),
      requestedSessions: Number(requestedCount.c),
      disputedSessions: Number(disputedCount.c),
      totalCreditsInSystem: Number(creditsSum.s),
      platformRevenue: Number(sessionFeeSum.s) + Number(withdrawalFeeSum.s),
      activeUsersToday: Number(activeTodayCount.c),
      newUsersToday: Number(newTodayCount.c),
      pendingWithdrawalsCount: Number(pendingWithdrawalsCount.c),
      totalWithdrawals: Number(totalWithdrawalsSum.s),
      recentUsers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 2. User management and user details
// -----------------------------------------------------------------------------

// GET /api/admin/users?page=1&limit=25
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const result = await paginatedUsers(page, limit, offset);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/:id
router.get("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const userId = positiveId(req.params.id);
  if (!userId) return next();
  try {
    const [user] = await db.select(publicUserColumns)
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return sendNotFound(res, "User not found");
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/:id/history
router.get("/user/:id/history", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  try {
    const [user, sessions, transactions] = await Promise.all([
      db.select(publicUserColumns).from(usersTable)
        .where(eq(usersTable.id, userId)).limit(1),
      db.select().from(sessionsTable)
        .where(or(eq(sessionsTable.mentorId, userId), eq(sessionsTable.studentId, userId)))
        .orderBy(desc(sessionsTable.createdAt)).limit(200),
      db.select().from(transactionsTable)
        .where(eq(transactionsTable.userId, userId))
        .orderBy(desc(transactionsTable.createdAt)).limit(200),
    ]);
    if (!user[0]) return sendNotFound(res, "User not found");
    return res.json({ success: true, user: user[0], sessions, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/:id/sessions
router.get("/users/:id/sessions", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  try {
    const { page, limit, offset } = pageParams(req.query);
    const condition = or(
      eq(sessionsTable.mentorId, userId),
      eq(sessionsTable.studentId, userId),
    );
    const [sessions, [{ total }]] = await Promise.all([
      db.select().from(sessionsTable).where(condition)
        .orderBy(desc(sessionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(sessionsTable).where(condition),
    ]);
    return res.json({
      success: true,
      sessions,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/:id/transactions
router.get("/users/:id/transactions", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  try {
    const { page, limit, offset } = pageParams(req.query);
    const [transactions, [{ total }]] = await Promise.all([
      db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId))
        .orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(transactionsTable)
        .where(eq(transactionsTable.userId, userId)),
    ]);
    return res.json({
      success: true,
      transactions,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 3. Session management
// -----------------------------------------------------------------------------

// GET /api/admin/sessions?page=1&limit=25&status=disputed
router.get("/sessions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const status = textValue(req.query.status, 40);
    const condition = status ? eq(sessionsTable.status, status) : undefined;
    const [sessions, [{ total }]] = await Promise.all([
      db.select().from(sessionsTable)
        .where(condition)
        .orderBy(desc(sessionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(sessionsTable).where(condition),
    ]);
    return res.json({
      success: true,
      sessions,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/sessions/:id
router.get("/sessions/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const sessionId = positiveId(req.params.id);
  if (!sessionId) return next();
  try {
    const [session] = await db.select().from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId)).limit(1);
    if (!session) return sendNotFound(res, "Session not found");
    const participantIds = [session.studentId, session.mentorId].filter((id) => id > 0);
    const participants = participantIds.length
      ? await db.select(publicUserColumns).from(usersTable)
        .where(sql`${usersTable.id} IN (${sql.join(participantIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];
    return res.json({ success: true, session, participants });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/sessions/:id/cancel
// Refund and status transition are committed in one database transaction.
router.patch("/sessions/:id/cancel", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const sessionId = requireValidId(req.params.id, res, "session id");
  if (!sessionId) return;
  const reason = textValue(req.body?.reason, 300) || "Cancelled by admin";
  try {
    const outcome = await db.transaction(async (tx) => {
      const [session] = await tx.select().from(sessionsTable)
        .where(eq(sessionsTable.id, sessionId)).limit(1);
      if (!session) return "NOT_FOUND";
      if (["completed", "cancelled"].includes(session.status)) return "RESOLVED";
      const [changed] = await tx.update(sessionsTable)
        .set({ status: "cancelled", cancelReason: `Admin #${adminId(req)}: ${reason}` })
        .where(and(
          eq(sessionsTable.id, sessionId),
          sql`${sessionsTable.status} NOT IN ('completed', 'cancelled')`,
        ))
        .returning({ id: sessionsTable.id });
      if (!changed) return "RESOLVED";
      const refund = Math.max(0, Number(session.creditsAmount || 0));
      if (refund > 0 && session.studentId > 0) {
        const [student] = await tx.update(usersTable)
          .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${refund}` })
          .where(eq(usersTable.id, session.studentId))
          .returning({ id: usersTable.id });
        if (!student) throw new Error("STUDENT_NOT_FOUND");
        await tx.insert(transactionsTable).values({
          userId: session.studentId,
          type: "refund",
          amount: refund,
          sessionId,
          description: `Admin #${adminId(req)} refunded cancelled session #${sessionId}: ${reason}`,
        });
      }
      return "OK";
    });
    if (outcome === "NOT_FOUND") return sendNotFound(res, "Session not found");
    if (outcome === "RESOLVED") return sendConflict(res, "Session already resolved");
    return res.json({ success: true, message: "Session cancelled and refund processed" });
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return sendConflict(res, "Session student account was not found; cancellation rolled back");
    }
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/sessions/:id/resolve { action: refund_student | pay_mentor }
router.post("/sessions/:id/resolve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const sessionId = requireValidId(req.params.id, res, "session id");
  if (!sessionId) return;
  const action = req.body?.action;
  if (!["refund_student", "pay_mentor"].includes(action)) {
    return sendBadRequest(res, "action must be refund_student or pay_mentor");
  }
  const reason = textValue(req.body?.reason, 300);
  try {
    const outcome = await db.transaction(async (tx) => {
      const [session] = await tx.select().from(sessionsTable)
        .where(eq(sessionsTable.id, sessionId)).limit(1);
      if (!session) return "NOT_FOUND";
      if (["completed", "cancelled"].includes(session.status)) return "RESOLVED";
      const amount = Math.max(0, Number(session.creditsAmount || 0));
      if (action === "refund_student" && session.studentId <= 0) return "INVALID_STUDENT";
      if (action === "pay_mentor" && session.mentorId <= 0) return "INVALID_MENTOR";
      const [changed] = await tx.update(sessionsTable)
        .set(action === "refund_student"
          ? {
              status: "cancelled",
              cancelReason: `Admin #${adminId(req)} resolved dispute: refund student. ${reason}`,
            }
          : {
              status: "completed",
              completedAt: new Date(),
              cancelReason: `Admin #${adminId(req)} resolved dispute: pay mentor. ${reason}`,
            })
        .where(and(
          eq(sessionsTable.id, sessionId),
          sql`${sessionsTable.status} NOT IN ('completed', 'cancelled')`,
        ))
        .returning({ id: sessionsTable.id });
      if (!changed) return "RESOLVED";
      if (amount > 0 && action === "refund_student") {
        const [student] = await tx.update(usersTable)
          .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${amount}` })
          .where(eq(usersTable.id, session.studentId))
          .returning({ id: usersTable.id });
        if (!student) throw new Error("STUDENT_NOT_FOUND");
        await tx.insert(transactionsTable).values({
          userId: session.studentId,
          amount,
          type: "refund",
          sessionId,
          description: `Admin #${adminId(req)} dispute refund for session #${sessionId}`,
        });
      }
      if (amount > 0 && action === "pay_mentor") {
        const mentorEarnings = amount - Math.round(amount * ADMIN_FEE_PERCENT / 100);
        const [mentor] = await tx.update(usersTable)
          .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${mentorEarnings}` })
          .where(eq(usersTable.id, session.mentorId))
          .returning({ id: usersTable.id });
        if (!mentor) throw new Error("MENTOR_NOT_FOUND");
        await tx.insert(transactionsTable).values({
          userId: session.mentorId,
          amount: mentorEarnings,
          type: "earned",
          sessionId,
          description: `Admin #${adminId(req)} dispute payout for session #${sessionId}`,
        });
      }
      return "OK";
    });
    if (outcome === "NOT_FOUND") return sendNotFound(res, "Session not found");
    if (outcome === "RESOLVED") return sendConflict(res, "Session already resolved");
    if (outcome === "INVALID_STUDENT") return sendBadRequest(res, "Session has no valid student");
    if (outcome === "INVALID_MENTOR") return sendBadRequest(res, "Session has no valid mentor");
    return res.json({ success: true, message: "Dispute resolved" });
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return sendConflict(res, "Student not found; operation rolled back");
    }
    if (error instanceof Error && error.message === "MENTOR_NOT_FOUND") {
      return sendConflict(res, "Mentor not found; operation rolled back");
    }
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/sessions/:id/flag
router.patch("/sessions/:id/flag", requireAuth, requireAdmin, async (req, res) => {
  const sessionId = requireValidId(req.params.id, res, "session id");
  if (!sessionId) return;
  if (!isBoolean(req.body?.flagged)) return sendBadRequest(res, "flagged must be boolean");
  const reason = textValue(req.body?.reason, 500);
  try {
    const [updated] = await db.update(sessionsTable)
      .set({ isFlagged: req.body.flagged, flagReason: req.body.flagged ? reason : null })
      .where(eq(sessionsTable.id, sessionId))
      .returning({ id: sessionsTable.id, isFlagged: sessionsTable.isFlagged });
    if (!updated) return sendNotFound(res, "Session not found");
    return res.json({ success: true, session: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 4. Transaction and wallet management
// -----------------------------------------------------------------------------

// GET /api/admin/transactions?page=1&limit=25&type=purchase
router.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const type = textValue(req.query.type, 60);
    const condition = type ? eq(transactionsTable.type, type) : undefined;
    const [transactions, [{ total }]] = await Promise.all([
      db.select().from(transactionsTable).where(condition)
        .orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(transactionsTable).where(condition),
    ]);
    return res.json({
      success: true,
      transactions,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/pending-withdrawals
router.get("/pending-withdrawals", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pending = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.type, "withdrawal_pending"))
      .orderBy(desc(transactionsTable.createdAt)).limit(100);
    return res.json({ success: true, withdrawals: pending });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/users/:id/credits { amount: integer, reason: string }
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const amount = Number(req.body?.amount);
  const reason = textValue(req.body?.reason, 300) || "No reason supplied";
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_CREDIT_ADJUSTMENT) {
    return sendBadRequest(res, `amount must be a non-zero integer within +/-${MAX_CREDIT_ADJUSTMENT}`);
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: usersTable.id, credits: usersTable.credits })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) return null;
      const current = Number(user.credits ?? 0);
      if (current + amount < 0 || current + amount > MAX_BALANCE) {
        throw new Error("CREDIT_BALANCE_OUT_OF_RANGE");
      }
      const [updated] = await tx.update(usersTable)
        .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${amount}` })
        .where(eq(usersTable.id, userId))
        .returning({ credits: usersTable.credits });
      await tx.insert(transactionsTable).values({
        userId,
        type: amount > 0 ? "bonus" : "admin_deduction",
        amount,
        description: `Admin #${adminId(req)} ${amount > 0 ? "credited" : "deducted"} ${Math.abs(amount)} credits. Reason: ${reason}`,
      });
      return updated;
    });
    if (!result) return sendNotFound(res, "User not found");
    void notifySafely(userId, "Wallet updated", `${amount > 0 ? "+" : ""}${amount} credits. ${reason}`, "/wallet");
    return res.json({ success: true, newBalance: result.credits });
  } catch (error) {
    if (error instanceof Error && error.message === "CREDIT_BALANCE_OUT_OF_RANGE") {
      return sendBadRequest(res, "Insufficient credits or balance limit exceeded");
    }
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/users/:id/credits/deduct - explicit alias for admin UI
router.post("/users/:id/credits/deduct", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return sendBadRequest(res, "amount must be a positive integer");
  }
  req.body.amount = -amount;
  // Reuse the same validation and atomic wallet implementation.
  const userId = positiveId(req.params.id);
  if (!userId) return sendBadRequest(res, "Invalid user id");
  const reason = textValue(req.body?.reason, 300) || "Admin deduction";
  if (amount > MAX_CREDIT_ADJUSTMENT) return sendBadRequest(res, "Deduction amount too large");
  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: usersTable.id, credits: usersTable.credits })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) return null;
      if (Number(user.credits ?? 0) < amount) throw new Error("INSUFFICIENT_CREDITS");
      const [updated] = await tx.update(usersTable)
        .set({ credits: sql`${usersTable.credits} - ${amount}` })
        .where(eq(usersTable.id, userId)).returning({ credits: usersTable.credits });
      await tx.insert(transactionsTable).values({
        userId,
        type: "admin_deduction",
        amount: -amount,
        description: `Admin #${adminId(req)} deducted ${amount} credits. Reason: ${reason}`,
      });
      return updated;
    });
    if (!result) return sendNotFound(res, "User not found");
    return res.json({ success: true, newBalance: result.credits });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return sendBadRequest(res, "User does not have enough credits");
    }
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/transactions/:id/complete
// Marks a withdrawal completed only after the real payout has been made.
router.patch("/transactions/:id/complete", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const transactionId = requireValidId(req.params.id, res, "transaction id");
  if (!transactionId) return;
  const payoutReference = textValue(req.body?.payoutReference, 200);
  if (!payoutReference) {
    return sendBadRequest(res, "payoutReference is required after completing the actual payout");
  }
  try {
    const [updated] = await db.update(transactionsTable)
      .set({
        type: "withdrawal_completed",
        reference: payoutReference,
        description: sql`COALESCE(${transactionsTable.description}, '') || ${` | Paid by admin #${adminId(req)}; reference: ${payoutReference}`}`,
      })
      .where(and(
        eq(transactionsTable.id, transactionId),
        eq(transactionsTable.type, "withdrawal_pending"),
      ))
      .returning({ id: transactionsTable.id, userId: transactionsTable.userId });
    if (!updated) return sendConflict(res, "Withdrawal not found or already processed");
    return res.json({ success: true, message: "Withdrawal marked completed", transactionId });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/transactions/:id/approve { payoutReference }
// Approval means the real payout has already been completed externally.
router.post("/transactions/:id/approve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const transactionId = requireValidId(req.params.id, res, "transaction id");
  if (!transactionId) return;
  const payoutReference = textValue(req.body?.payoutReference, 200);
  if (!payoutReference) {
    return sendBadRequest(res, "Complete the payout first and provide payoutReference");
  }
  try {
    const [updated] = await db.update(transactionsTable)
      .set({
        type: "withdrawal_completed",
        reference: payoutReference,
        description: sql`COALESCE(${transactionsTable.description}, '') || ${` | Approved by admin #${adminId(req)}; payout ref: ${payoutReference}`}`,
      })
      .where(and(
        eq(transactionsTable.id, transactionId),
        eq(transactionsTable.type, "withdrawal_pending"),
      ))
      .returning({ id: transactionsTable.id });
    if (!updated) return sendConflict(res, "Withdrawal not found or already processed");
    return res.json({ success: true, message: "Withdrawal marked paid" });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/transactions/:id/reject { reason }
router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const transactionId = requireValidId(req.params.id, res, "transaction id");
  if (!transactionId) return;
  const reason = textValue(req.body?.reason, 250) || "Rejected by admin";
  try {
    const outcome = await db.transaction(async (tx) => {
      const [withdrawal] = await tx.select().from(transactionsTable)
        .where(and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.type, "withdrawal_pending"),
        )).limit(1);
      if (!withdrawal) return "NOT_PENDING";
      const refundAmount = Math.abs(Number(withdrawal.amount));
      const [changed] = await tx.update(transactionsTable)
        .set({
          type: "withdrawal_rejected",
          description: `${withdrawal.description || ""} | Rejected by admin #${adminId(req)}: ${reason}`,
        })
        .where(and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.type, "withdrawal_pending"),
        ))
        .returning({ id: transactionsTable.id });
      if (!changed) return "NOT_PENDING";
      if (refundAmount > 0) {
        const [user] = await tx.update(usersTable)
          .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${refundAmount}` })
          .where(eq(usersTable.id, withdrawal.userId))
          .returning({ id: usersTable.id });
        if (!user) throw new Error("WITHDRAWAL_USER_NOT_FOUND");
        await tx.insert(transactionsTable).values({
          userId: withdrawal.userId,
          amount: refundAmount,
          type: "refund",
          description: `Refund for rejected withdrawal #${transactionId}`,
        });
      }
      return "OK";
    });
    if (outcome === "NOT_PENDING") return sendConflict(res, "Withdrawal not found or already processed");
    return res.json({ success: true, message: "Withdrawal rejected and credits refunded" });
  } catch (error) {
    if (error instanceof Error && error.message === "WITHDRAWAL_USER_NOT_FOUND") {
      return sendConflict(res, "Withdrawal owner not found; operation rolled back");
    }
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 5. Account moderation
// -----------------------------------------------------------------------------

// PATCH /api/admin/users/:id/suspend { suspend: boolean, reason?: string }
router.patch("/users/:id/suspend", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const suspend = req.body?.suspend;
  const reason = textValue(req.body?.reason, 300) || "No reason supplied";
  if (!isBoolean(suspend)) return sendBadRequest(res, "suspend must be a boolean");
  if (userId === adminId(req)) return sendBadRequest(res, "You cannot suspend your own account");
  try {
    const [updated] = await db.update(usersTable)
      .set({ isSuspended: suspend })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, isSuspended: usersTable.isSuspended });
    if (!updated) return sendNotFound(res, "User not found");
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN] User #${userId} ${suspend ? "suspended" : "unsuspended"}. Reason: ${reason}`,
    );
    return res.json({
      success: true,
      message: `User ${suspend ? "suspended" : "unsuspended"}`,
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// DELETE /api/admin/users/:id
// This is a soft-ban/suspension. User financial/session history is preserved.
router.delete("/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  if (userId === adminId(req)) return sendBadRequest(res, "You cannot ban your own account");
  const reason = textValue(req.body?.reason, 300) || "Banned by admin";
  try {
    const [updated] = await db.update(usersTable)
      .set({ trustScore: -999, isSuspended: true })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, isSuspended: usersTable.isSuspended });
    if (!updated) return sendNotFound(res, "User not found");
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN] User #${userId} banned/suspended. Reason: ${reason}`,
    );
    return res.json({ success: true, message: "User suspended and marked as banned" });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/users/:id/verify { isPremium: boolean }
// Existing schema has isPremiumUser; it does not have a separate manual identity
// verification field, so this endpoint only controls the premium flag.
router.patch("/users/:id/verify", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const isPremium = req.body?.isPremium;
  if (!isBoolean(isPremium)) return sendBadRequest(res, "isPremium must be a boolean");
  try {
    const [updated] = await db.update(usersTable)
      .set({ isPremiumUser: isPremium })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, isPremiumUser: usersTable.isPremiumUser });
    if (!updated) return sendNotFound(res, "User not found");
    return res.json({ success: true, user: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/users/:id/premium
router.patch("/users/:id/premium", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const enabled = req.body?.enabled;
  if (!isBoolean(enabled)) return sendBadRequest(res, "enabled must be a boolean");
  const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return sendBadRequest(res, "expiresAt must be a valid date");
  }
  try {
    const [updated] = await db.update(usersTable)
      .set({ isPremiumUser: enabled, premiumExpiresAt: enabled ? expiresAt : null })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        isPremiumUser: usersTable.isPremiumUser,
        premiumExpiresAt: usersTable.premiumExpiresAt,
      });
    if (!updated) return sendNotFound(res, "User not found");
    return res.json({ success: true, user: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/users/:id/reset-password { newPassword }
// Existing JWT implementation has no token-version/revocation column. This changes
// the password hash but cannot revoke already issued stateless JWTs.
router.post("/users/:id/reset-password", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const newPassword = req.body?.newPassword;
  if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128) {
    return sendBadRequest(res, "Password must be 10-128 characters");
  }
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash(newPassword, 12);
    const [updated] = await db.update(usersTable)
      .set({ passwordHash: hash })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });
    if (!updated) return sendNotFound(res, "User not found");
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN] Password reset for user #${userId}`,
    );
    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/users/:id/login-as
// Disabled: current signToken creates a normal 7-day user token and has no scoped
// impersonation claims. Returning a normal token here would be unsafe.
router.post("/users/:id/login-as", requireAuth, requireAdmin, async (_req, res) => {
  return res.status(501).json({
    success: false,
    error: "Impersonation is disabled until restricted short-lived tokens and audit controls are implemented.",
  });
});

// -----------------------------------------------------------------------------
// 6. Notifications and broadcast
// -----------------------------------------------------------------------------

// POST /api/admin/notifications/send { title, message, targetGroup }
// targetGroup: all | mentors | students
router.post("/notifications/send", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const title = textValue(req.body?.title, 120);
  const message = textValue(req.body?.message, 2000);
  const targetGroup = req.body?.targetGroup;
  if (!title || !message) return sendBadRequest(res, "title and message are required");
  if (!["all", "mentors", "students"].includes(targetGroup)) {
    return sendBadRequest(res, "targetGroup must be all, mentors or students");
  }
  try {
    let userIds: number[] = [];
    if (targetGroup === "all") {
      const rows = await db.select({ id: usersTable.id }).from(usersTable)
        .where(sql`COALESCE(${usersTable.trustScore}, 0) > -999`);
      userIds = rows.map((row) => row.id);
    } else if (targetGroup === "mentors") {
      const rows = await db.selectDistinct({ id: sessionsTable.mentorId })
        .from(sessionsTable).where(sql`${sessionsTable.mentorId} > 0`);
      userIds = rows.map((row) => row.id);
    } else {
      const rows = await db.selectDistinct({ id: sessionsTable.studentId })
        .from(sessionsTable).where(sql`${sessionsTable.studentId} > 0`);
      userIds = rows.map((row) => row.id);
    }
    if (!userIds.length) {
      return res.json({ success: true, sentTo: 0, totalTargeted: 0 });
    }
    let sentCount = 0;
    let failedCount = 0;
    for (let index = 0; index < userIds.length; index += NOTIFICATION_BATCH_SIZE) {
      const batch = userIds.slice(index, index + NOTIFICATION_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((userId) => notify.adminBroadcast(userId, title, message, "/dashboard")),
      );
      sentCount += results.filter((result) => result.status === "fulfilled").length;
      failedCount += results.filter((result) => result.status === "rejected").length;
      if (index + NOTIFICATION_BATCH_SIZE < userIds.length) {
        await delay(NOTIFICATION_BATCH_DELAY_MS);
      }
    }
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN BROADCAST] ${title}; sent ${sentCount}/${userIds.length}; target=${targetGroup}`,
    );
    return res.json({
      success: true,
      sentTo: sentCount,
      failed: failedCount,
      totalTargeted: userIds.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// POST /api/admin/notifications/user/:id
router.post("/notifications/user/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = requireValidId(req.params.id, res, "user id");
  if (!userId) return;
  const title = textValue(req.body?.title, 120);
  const message = textValue(req.body?.message, 2000);
  if (!title || !message) return sendBadRequest(res, "title and message are required");
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return sendNotFound(res, "User not found");
    await notifySafely(userId, title, message, textValue(req.body?.actionUrl, 200) || "/dashboard");
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN] Notification sent to user #${userId}: ${title}`,
    );
    return res.json({ success: true, message: "Notification queued" });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 7. Analytics
// -----------------------------------------------------------------------------

// GET /api/admin/analytics
router.get("/analytics", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [userGrowth, sessionGrowth, revenueData, topMentors, topSkills] = await Promise.all([
      db.execute(sql`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT DATE(created_at) AS date, COUNT(*)::int AS count
        FROM sessions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT DATE(created_at) AS date,
               ROUND(SUM(credits_amount * ${ADMIN_FEE_PERCENT} / 100.0)) AS revenue
        FROM sessions
        WHERE status = 'completed'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT u.id, u.name, u.avatar, u.average_rating,
               COUNT(s.id)::int AS session_count,
               ROUND(SUM(s.credits_amount * (100 - ${ADMIN_FEE_PERCENT}) / 100.0)) AS total_earned
        FROM sessions s
        JOIN users u ON u.id = s.mentor_id
        WHERE s.status = 'completed'
        GROUP BY u.id, u.name, u.avatar, u.average_rating
        ORDER BY session_count DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT skill, COUNT(*)::int AS count
        FROM sessions
        WHERE status = 'completed'
        GROUP BY skill
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);
    return res.json({
      success: true,
      userGrowth: userGrowth.rows,
      sessionGrowth: sessionGrowth.rows,
      revenueData: revenueData.rows,
      topMentors: topMentors.rows,
      topSkills: topSkills.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/analytics/summary
router.get("/analytics/summary", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [users, sessions, completed, revenue, earned] = await Promise.all([
      db.select({ total: count() }).from(usersTable),
      db.select({ total: count() }).from(sessionsTable),
      db.select({ total: count() }).from(sessionsTable)
        .where(eq(sessionsTable.status, "completed")),
      db.select({ total: sql<number>`COALESCE(SUM(ROUND(${sessionsTable.creditsAmount} * ${ADMIN_FEE_PERCENT} / 100.0)), 0)` })
        .from(sessionsTable).where(eq(sessionsTable.status, "completed")),
      db.select({ total: sql<number>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable).where(eq(transactionsTable.type, "earned")),
    ]);
    return res.json({
      success: true,
      users: Number(users[0]?.total ?? 0),
      sessions: Number(sessions[0]?.total ?? 0),
      completedSessions: Number(completed[0]?.total ?? 0),
      estimatedPlatformRevenue: Number(revenue[0]?.total ?? 0),
      mentorCreditsEarned: Number(earned[0]?.total ?? 0),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 8. Platform settings
// -----------------------------------------------------------------------------

// GET /api/admin/settings
router.get("/settings", requireAuth, requireAdmin, async (_req, res) => {
  return res.json({ success: true, settings: platformSettings, persistence: "in-memory" });
});

// PATCH /api/admin/settings
// Settings are in-memory because the supplied schemas contain no settings table.
router.patch("/settings", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return sendBadRequest(res, "A settings object is required");
  }
  const validators: Record<string, (value: unknown) => boolean> = {
    sessionFeePercent: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100,
    withdrawalFeePercent: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100,
    referralBonus: (value) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100_000,
    welcomeCredits: (value) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100_000,
    maintenanceMode: (value) => typeof value === "boolean",
    minWithdrawal: (value) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 10_000_000,
    creditLockDays: (value) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 365,
  };
  for (const [key, value] of Object.entries(req.body)) {
    if (!validators[key]) return sendBadRequest(res, `Unknown setting: ${key}`);
    if (!validators[key](value)) return sendBadRequest(res, `Invalid value for ${key}`);
  }
  try {
    Object.assign(platformSettings, req.body);
    await writeAdminLedgerEntry(
      adminId(req),
      "admin_action",
      `[ADMIN] Platform settings changed: ${JSON.stringify(req.body)}`,
    );
    return res.json({
      success: true,
      settings: platformSettings,
      persistence: "in-memory; values reset when the server restarts",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 9. Global search
// -----------------------------------------------------------------------------

// GET /api/admin/search?q=keyword
router.get("/search", requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = textValue(req.query.q, 100);
    if (query.length < 2) {
      return res.json({ success: true, users: [], sessions: [], transactions: [] });
    }
    const pattern = `%${query}%`;
    const [users, sessions, transactions] = await Promise.all([
      db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        credits: usersTable.credits,
        averageRating: usersTable.averageRating,
        createdAt: usersTable.createdAt,
      }).from(usersTable)
        .where(or(ilike(usersTable.name, pattern), ilike(usersTable.email, pattern)))
        .limit(10),
      db.execute(sql`
        SELECT s.id, s.skill, s.status, s.credits_amount, s.scheduled_date,
               student.name AS student_name, mentor.name AS mentor_name
        FROM sessions s
        LEFT JOIN users student ON student.id = s.student_id
        LEFT JOIN users mentor ON mentor.id = s.mentor_id
        WHERE s.skill ILIKE ${pattern}
           OR student.name ILIKE ${pattern}
           OR mentor.name ILIKE ${pattern}
        ORDER BY s.created_at DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT t.id, t.type, t.amount, t.description, t.created_at, u.name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE COALESCE(t.description, '') ILIKE ${pattern}
           OR COALESCE(u.name, '') ILIKE ${pattern}
        ORDER BY t.created_at DESC
        LIMIT 10
      `),
    ]);
    return res.json({
      success: true,
      users,
      sessions: sessions.rows,
      transactions: transactions.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 10. Risk and moderation reports
// -----------------------------------------------------------------------------

// GET /api/admin/reports - heuristic risk indicators, not automatic fraud findings
router.get("/reports", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [highRefunds, inactiveNewUsers, topEarners, flaggedSessions] = await Promise.all([
      db.execute(sql`
        SELECT u.id, u.name, u.email, COUNT(s.id)::int AS cancelled_count
        FROM sessions s
        JOIN users u ON u.id = s.student_id
        WHERE s.status = 'cancelled'
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(s.id) >= 3
        ORDER BY cancelled_count DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT id, name, email, credits, created_at
        FROM users
        WHERE COALESCE(sessions_completed, 0) = 0
          AND created_at <= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT u.id, u.name, u.email,
               COUNT(s.id)::int AS sessions,
               SUM(s.credits_amount * (100 - ${ADMIN_FEE_PERCENT}) / 100.0) AS earned
        FROM sessions s
        JOIN users u ON u.id = s.mentor_id
        WHERE s.status = 'completed'
        GROUP BY u.id, u.name, u.email
        ORDER BY earned DESC
        LIMIT 10
      `),
      db.select().from(sessionsTable)
        .where(eq(sessionsTable.isFlagged, true))
        .orderBy(desc(sessionsTable.createdAt)).limit(50),
    ]);
    return res.json({
      success: true,
      highRefundUsers: highRefunds.rows,
      inactiveNewUsers: inactiveNewUsers.rows,
      topEarners: topEarners.rows,
      flaggedSessions,
      note: "These are review signals, not proof of fraud.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/user-reports
router.get("/user-reports", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const [allReports, [{ total }]] = await Promise.all([
      db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt))
        .limit(limit).offset(offset),
      db.select({ total: count() }).from(reportsTable),
    ]);
    const userIds = [...new Set(allReports.flatMap((report) => [report.reporterId, report.reportedUserId]))];
    const allUsers = userIds.length
      ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(sql`${usersTable.id} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];
    const userMap = new Map(allUsers.map((user) => [user.id, user]));
    const reports = allReports.map((report) => ({
      ...report,
      reporterName: userMap.get(report.reporterId)?.name || `User #${report.reporterId}`,
      reportedName: userMap.get(report.reportedUserId)?.name || `User #${report.reportedUserId}`,
      reportedEmail: userMap.get(report.reportedUserId)?.email || null,
    }));
    return res.json({
      success: true,
      reports,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// PATCH /api/admin/user-reports/:id/resolve { status: reviewed | dismissed }
router.patch("/user-reports/:id/resolve", requireAuth, requireAdmin, async (req, res) => {
  const reportId = requireValidId(req.params.id, res, "report id");
  if (!reportId) return;
  const status = req.body?.status;
  if (!["reviewed", "dismissed"].includes(status)) {
    return sendBadRequest(res, "status must be reviewed or dismissed");
  }
  try {
    const [updated] = await db.update(reportsTable)
      .set({ status } as any)
      .where(eq(reportsTable.id, reportId))
      .returning({ id: reportsTable.id, status: reportsTable.status });
    if (!updated) return sendNotFound(res, "Report not found");
    return res.json({ success: true, report: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 11. User lists and filters
// -----------------------------------------------------------------------------

// GET /api/admin/users/search?q=...&page=1&limit=25
router.get("/users/search", requireAuth, requireAdmin, async (req, res) => {
  const query = textValue(req.query.q, 100);
  if (query.length < 2) return res.json({ success: true, users: [] });
  try {
    const { page, limit, offset } = pageParams(req.query);
    const pattern = `%${query}%`;
    const condition = or(
      ilike(usersTable.name, pattern),
      ilike(usersTable.email, pattern),
      ilike(usersTable.location, pattern),
    );
    const [users, [{ total }]] = await Promise.all([
      db.select(publicUserColumns).from(usersTable).where(condition)
        .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(usersTable).where(condition),
    ]);
    return res.json({
      success: true,
      users,
      pagination: paginationResponse(page, limit, Number(total)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/status/suspended
router.get("/users/status/suspended", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const condition = eq(usersTable.isSuspended, true);
    const [users, [{ total }]] = await Promise.all([
      db.select(publicUserColumns).from(usersTable).where(condition)
        .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(usersTable).where(condition),
    ]);
    return res.json({ success: true, users, pagination: paginationResponse(page, limit, Number(total)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/status/premium
router.get("/users/status/premium", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const condition = eq(usersTable.isPremiumUser, true);
    const [users, [{ total }]] = await Promise.all([
      db.select(publicUserColumns).from(usersTable).where(condition)
        .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(usersTable).where(condition),
    ]);
    return res.json({ success: true, users, pagination: paginationResponse(page, limit, Number(total)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/users/status/unverified
router.get("/users/status/unverified", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const condition = eq(usersTable.isEmailVerifiedStatus, false);
    const [users, [{ total }]] = await Promise.all([
      db.select(publicUserColumns).from(usersTable).where(condition)
        .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(usersTable).where(condition),
    ]);
    return res.json({ success: true, users, pagination: paginationResponse(page, limit, Number(total)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 12. Session and transaction date filters
// -----------------------------------------------------------------------------

// GET /api/admin/sessions/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/sessions/date-range", requireAuth, requireAdmin, async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  if (from && Number.isNaN(from.getTime())) return sendBadRequest(res, "Invalid from date");
  if (to && Number.isNaN(to.getTime())) return sendBadRequest(res, "Invalid to date");
  try {
    const conditions = [];
    if (from) conditions.push(gte(sessionsTable.createdAt, from));
    if (to) conditions.push(lte(sessionsTable.createdAt, to));
    const { page, limit, offset } = pageParams(req.query);
    const condition = conditions.length ? and(...conditions) : undefined;
    const [sessions, [{ total }]] = await Promise.all([
      db.select().from(sessionsTable).where(condition)
        .orderBy(desc(sessionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(sessionsTable).where(condition),
    ]);
    return res.json({ success: true, sessions, pagination: paginationResponse(page, limit, Number(total)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// GET /api/admin/transactions/date-range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/transactions/date-range", requireAuth, requireAdmin, async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  if (from && Number.isNaN(from.getTime())) return sendBadRequest(res, "Invalid from date");
  if (to && Number.isNaN(to.getTime())) return sendBadRequest(res, "Invalid to date");
  try {
    const conditions = [];
    if (from) conditions.push(gte(transactionsTable.createdAt, from));
    if (to) conditions.push(lte(transactionsTable.createdAt, to));
    const { page, limit, offset } = pageParams(req.query);
    const condition = conditions.length ? and(...conditions) : undefined;
    const [transactions, [{ total }]] = await Promise.all([
      db.select().from(transactionsTable).where(condition)
        .orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(transactionsTable).where(condition),
    ]);
    return res.json({ success: true, transactions, pagination: paginationResponse(page, limit, Number(total)) });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 13. Admin health and operational information
// -----------------------------------------------------------------------------

// GET /api/admin/health
router.get("/health", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    return res.json({
      success: true,
      database: "connected",
      api: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      database: "unavailable",
      error: safeError(error),
    });
  }
});

// GET /api/admin/overview
router.get("/overview", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [users, suspended, premium, sessions, disputed, pendingWithdrawals] = await Promise.all([
      db.select({ value: count() }).from(usersTable),
      db.select({ value: count() }).from(usersTable).where(eq(usersTable.isSuspended, true)),
      db.select({ value: count() }).from(usersTable).where(eq(usersTable.isPremiumUser, true)),
      db.select({ value: count() }).from(sessionsTable),
      db.select({ value: count() }).from(sessionsTable).where(eq(sessionsTable.status, "disputed")),
      db.select({ value: count() }).from(transactionsTable)
        .where(eq(transactionsTable.type, "withdrawal_pending")),
    ]);
    return res.json({
      success: true,
      users: Number(users[0].value),
      suspendedUsers: Number(suspended[0].value),
      premiumUsers: Number(premium[0].value),
      sessions: Number(sessions[0].value),
      disputedSessions: Number(disputed[0].value),
      pendingWithdrawals: Number(pendingWithdrawals[0].value),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: safeError(error) });
  }
});

// -----------------------------------------------------------------------------
// 14. Explicitly unsupported capabilities (avoid unsafe fake implementations)
// -----------------------------------------------------------------------------

// GET /api/admin/capabilities
router.get("/capabilities", requireAuth, requireAdmin, async (_req, res) => {
  return res.json({
    success: true,
    available: [
      "dashboard_stats",
      "user_management",
      "session_management",
      "wallet_credit_adjustments",
      "withdrawal_status_management",
      "dispute_resolution",
      "notifications",
      "analytics",
      "user_reports",
      "moderation",
      "global_search",
    ],
    limitations: {
      bankPayout: "No payout provider is wired into this router. Admin must complete payout externally before marking it paid.",
      persistentSettings: "No platform settings table exists in the supplied schema; current settings are in-memory.",
      impersonation: "Disabled because the current JWT utility cannot issue restricted short-lived impersonation tokens.",
      auditLog: "Admin actions are recorded as admin_action transactions because no dedicated audit table was supplied.",
      tokenRevocation: "Password reset cannot revoke already-issued stateless JWTs with the supplied auth schema.",
    },
  });
});

// -----------------------------------------------------------------------------
// End of admin router
// -----------------------------------------------------------------------------

export default router;
