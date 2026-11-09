import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "../db.js";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { transactionsTable, usersTable, withdrawalsTable } from "../schema/index.js";

const router: IRouter = Router();

// ───────────────────────── Config ─────────────────────────
const MIN_WITHDRAWAL = 1000;          // credits
const FEE_PERCENT = 15;
const CLEARED_PERCENT = 100 - FEE_PERCENT; // mentor's share of a session
const FIRST_RESERVE = 200;            // credits, held 30 days on first payout
const RESERVE_DAYS = 30;
const DAY_MS = 86_400_000;

const WITHDRAWAL_STATUSES = ["requested", "processing", "review", "paid", "rejected"] as const;
const OPEN_STATUSES = ["requested", "processing", "review"];

// Default secret ONLY in explicit development. Anything else must set CRON_SECRET.
const CRON_SECRET =
  process.env.CRON_SECRET ||
  (process.env.NODE_ENV === "development" ? "dev-cron-secret" : "");

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

// ───────────────────────── Helpers ─────────────────────────
class WalletError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(res: Response, error: unknown) {
  if (error instanceof WalletError) return res.status(error.status).json({ error: error.message });
  console.error("[wallet]", error);
  return res.status(500).json({ error: "Wallet request failed. Please try again." });
}

function validUpi(value: string) {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(value);
}

function maskUpi(upi: string | null | undefined) {
  if (!upi) return null;
  const [name = "", handle = ""] = upi.split("@");
  return `${name.slice(0, 2)}***@${handle}`;
}

function publicWithdrawal<T extends { upiId?: string | null }>(w: T) {
  return { ...w, upiId: maskUpi(w.upiId) };
}

function pageParams(req: Request, defaultLimit = 50, maxLimit = 100) {
  const limit = Math.min(Math.max(Number(req.query.limit) || defaultLimit, 1), maxLimit);
  const page = Math.max(Number(req.query.page) || 1, 1);
  return { limit, offset: (page - 1) * limit };
}

function sha(value: string) {
  return createHash("sha256").update(value).digest();
}

async function assertAdmin(req: AuthRequest) {
  const [user] = await db
    .select({ isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));
  if (Number(user?.isAdmin || 0) !== 1) throw new WalletError(403, "Admin access required.");
}

/**
 * Use this everywhere credits are SPENT (sessions, unlocks, etc).
 * It keeps the invariant earnedBalance <= credits, so purchased credits can
 * never turn into "earned" (withdrawable) credits after a spend + re-purchase.
 * In Postgres all SET expressions read the OLD row, so this is atomic.
 */
export async function debitCredits(executor: Executor, userId: number, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new WalletError(400, "Invalid amount.");
  const rows = await executor
    .update(usersTable)
    .set({
      credits: sql`${usersTable.credits} - ${amount}`,
      earnedBalance: sql`LEAST(COALESCE(${usersTable.earnedBalance}, 0), ${usersTable.credits} - ${amount})`,
    } as any)
    .where(and(eq(usersTable.id, userId), gte(usersTable.credits, amount)))
    .returning({ id: usersTable.id });
  if (!rows.length) throw new WalletError(402, "Insufficient credits.");
}

/**
 * Only `earnedBalance` is eligible for withdrawal.
 * It is increased by sessions.ts only after its 168-hour clearance.
 * Purchased / signup / referral credits never increase earnedBalance.
 */
async function walletStats(userId: number, executor: Executor = db) {
  const [user] = await executor
    .select({ credits: usersTable.credits, earnedBalance: usersTable.earnedBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) throw new WalletError(404, "User not found.");

  const pending = await executor.execute(sql`
    SELECT COALESCE(SUM(GREATEST(0, FLOOR(credits_amount * ${CLEARED_PERCENT}::int / 100.0))), 0)::int AS pending
    FROM sessions
    WHERE mentor_id = ${userId}
      AND status = 'pending_clearance'
  `);

  const earned = await executor.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::int AS total
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'earned'
      AND amount > 0
  `);

  const credits = Number(user.credits || 0);
  const earnedBalance = Math.max(0, Number(user.earnedBalance || 0));
  return {
    balance: credits,
    earnedBalance,
    totalEarned: Number((earned.rows[0] as any)?.total || 0),
    pendingClearance: Number((pending.rows[0] as any)?.pending || 0),
    withdrawableBalance: Math.min(credits, earnedBalance),
  };
}

async function hasEverUsedFirstReserve(userId: number, executor: Executor = db) {
  // A rejected request never completed a first withdrawal, so it must not
  // consume the user's one-time reserve benefit.
  const rows = await executor
    .select({ id: withdrawalsTable.id })
    .from(withdrawalsTable)
    .where(
      and(
        eq(withdrawalsTable.userId, userId),
        gte(withdrawalsTable.reserveAmount, 1),
        inArray(withdrawalsTable.status, ["paid", "requested", "processing", "review"]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ───────────────────────── User routes ─────────────────────────

// GET /api/wallet
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const stats = await walletStats(userId);

    const withdrawals = await db
      .select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, userId))
      .orderBy(desc(withdrawalsTable.requestedAt))
      .limit(30);

    // SQL sum over ALL locked reserves (not just the last 30 rows)
    const [reserve] = await db
      .select({ total: sql<number>`COALESCE(SUM(${withdrawalsTable.reserveAmount}), 0)::int` })
      .from(withdrawalsTable)
      .where(and(eq(withdrawalsTable.userId, userId), eq(withdrawalsTable.reserveStatus, "locked")));

    return res.json({
      balance: stats.balance,
      totalEarned: stats.totalEarned,
      earnedBalance: stats.earnedBalance,
      withdrawableBalance: stats.withdrawableBalance,
      pendingClearance: stats.pendingClearance,
      reserveBalance: Number(reserve?.total || 0),
      firstWithdrawalReserveApplied: await hasEverUsedFirstReserve(userId),
      withdrawals: withdrawals.map(publicWithdrawal),
    });
  } catch (error) {
    return fail(res, error);
  }
});

// GET /api/wallet/transactions?limit=50&page=1
router.get("/transactions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = pageParams(req);
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);
    return res.json(rows);
  } catch (error) {
    return fail(res, error);
  }
});

// GET /api/wallet/withdrawals
router.get("/withdrawals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = pageParams(req);
    const rows = await db
      .select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.userId, req.userId!))
      .orderBy(desc(withdrawalsTable.requestedAt))
      .limit(limit)
      .offset(offset);
    return res.json(rows.map(publicWithdrawal));
  } catch (error) {
    return fail(res, error);
  }
});

// POST /api/wallet/withdraw
router.post("/withdraw", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const amount = Number(req.body?.amount);
    const upiId = String(req.body?.upiId || "").trim().toLowerCase();

    if (!Number.isSafeInteger(amount) || amount < MIN_WITHDRAWAL) {
      throw new WalletError(400, `Minimum withdrawal is ${MIN_WITHDRAWAL} credits.`);
    }
    if (!validUpi(upiId)) throw new WalletError(400, "Enter a valid UPI ID.");

    const created = await db.transaction(async (tx) => {
      // Lock user row so two simultaneous requests cannot reserve the same earnings.
      const lock = await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
      if (!lock.rows.length) throw new WalletError(404, "User not found.");

      const active = await tx
        .select({ id: withdrawalsTable.id })
        .from(withdrawalsTable)
        .where(and(eq(withdrawalsTable.userId, userId), inArray(withdrawalsTable.status, OPEN_STATUSES)))
        .limit(1);
      if (active.length) throw new WalletError(409, "You already have a withdrawal awaiting resolution.");

      const stats = await walletStats(userId, tx);
      if (amount > stats.withdrawableBalance) {
        throw new WalletError(
          400,
          `You can withdraw only ${stats.withdrawableBalance} cleared teaching credits. Purchased, signup and referral credits are not withdrawable.`,
        );
      }

      const firstReserve = !(await hasEverUsedFirstReserve(userId, tx));
      const reserve = firstReserve ? FIRST_RESERVE : 0;
      const fee = Math.round((amount * FEE_PERCENT) / 100);
      const payout = amount - fee - reserve;
      if (payout <= 0) throw new WalletError(400, "Amount is too small after fee and first-withdrawal reserve.");

      const debited = await tx
        .update(usersTable)
        .set({
          credits: sql`${usersTable.credits} - ${amount}`,
          earnedBalance: sql`GREATEST(0, COALESCE(${usersTable.earnedBalance}, 0) - ${amount})`,
        } as any)
        .where(
          and(
            eq(usersTable.id, userId),
            gte(usersTable.credits, amount),
            gte(usersTable.earnedBalance, amount),
          ),
        )
        .returning({ id: usersTable.id });

      if (!debited.length) throw new WalletError(409, "Your withdrawable balance changed. Refresh and try again.");

      const [row] = await tx
        .insert(withdrawalsTable)
        .values({
          userId,
          requestedAmount: amount,
          platformFee: fee,
          reserveAmount: reserve,
          payoutAmount: payout,
          upiId,
          status: "requested",
          reserveStatus: reserve > 0 ? "awaiting_payout" : "not_applicable",
        })
        .returning();

      // This is the ONLY ledger row that moves the balance for a withdrawal.
      await tx.insert(transactionsTable).values({
        userId,
        amount: -amount,
        type: "withdrawal_pending",
        description: `Withdrawal #${row.id}: gross ${amount}, fee ${fee}, reserve ${reserve}, net payout ${payout} credits. Awaiting actual payout.`,
        createdAt: new Date(),
      });

      return {
        withdrawalId: row.id,
        requestedAmount: amount,
        platformFee: fee,
        reserveAmount: reserve,
        payoutAmount: payout,
        status: "requested",
        firstWithdrawalReserveApplied: firstReserve,
      };
    });

    return res.status(201).json({
      success: true,
      ...created,
      message: "Request received. Payment is not complete until an actual payout is confirmed.",
    });
  } catch (error) {
    return fail(res, error);
  }
});

// ───────────────────────── Admin routes ─────────────────────────
// Admin identity is checked against users.is_admin in the database.

// GET /api/wallet/admin/withdrawals?status=requested&limit=50&page=1
router.get("/admin/withdrawals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await assertAdmin(req);
    const status = String(req.query.status || "");
    if (status && !(WITHDRAWAL_STATUSES as readonly string[]).includes(status)) {
      throw new WalletError(400, "Invalid status filter.");
    }
    const { limit, offset } = pageParams(req, 50, 200);
    const base = db.select().from(withdrawalsTable);
    const rows = await (status ? base.where(eq(withdrawalsTable.status, status)) : base)
      .orderBy(desc(withdrawalsTable.requestedAt))
      .limit(limit)
      .offset(offset);
    return res.json(rows); // admin needs the full UPI ID to pay out
  } catch (error) {
    return fail(res, error);
  }
});

router.post("/admin/withdrawals/:id/paid", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await assertAdmin(req);
    const adminId = req.userId!;
    const id = Number(req.params.id);
    const reference = String(req.body?.payoutReference || "").trim();
    if (!Number.isSafeInteger(id) || id <= 0) throw new WalletError(400, "Invalid withdrawal ID.");
    if (reference.length < 3 || reference.length > 120) {
      throw new WalletError(400, "Actual payout reference is required.");
    }

    const saved = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
      if (!row) throw new WalletError(404, "Withdrawal not found.");
      if (!OPEN_STATUSES.includes(row.status)) throw new WalletError(409, "This request cannot be marked paid.");
      if (row.userId === adminId) throw new WalletError(403, "You cannot process your own withdrawal.");

      // Same UTR/reference must never be used for two withdrawals.
      const dup = await tx
        .select({ id: withdrawalsTable.id })
        .from(withdrawalsTable)
        .where(eq(withdrawalsTable.payoutReference, reference))
        .limit(1);
      if (dup.length) throw new WalletError(409, "This payout reference is already used.");

      const now = new Date();
      const releaseAt = row.reserveAmount > 0 ? new Date(now.getTime() + RESERVE_DAYS * DAY_MS) : null;

      const [updated] = await tx
        .update(withdrawalsTable)
        .set({
          status: "paid",
          payoutReference: reference,
          paidAt: now,
          processedAt: now,
          reserveStatus: row.reserveAmount > 0 ? "locked" : "not_applicable",
          reserveReleaseAt: releaseAt,
        })
        .where(and(eq(withdrawalsTable.id, id), inArray(withdrawalsTable.status, OPEN_STATUSES)))
        .returning();
      if (!updated) throw new WalletError(409, "Withdrawal was already updated.");

      // amount: 0 → record only. The balance already moved at request time,
      // so a non-zero amount here would double-count in the ledger.
      await tx.insert(transactionsTable).values({
        userId: row.userId,
        amount: 0,
        type: "withdrawal_paid",
        description: `Withdrawal #${id} paid (${row.payoutAmount} credits). Reference: ${reference}. By admin #${adminId}.`,
        createdAt: now,
      });
      return updated;
    });

    return res.json({ success: true, withdrawal: saved });
  } catch (error) {
    return fail(res, error);
  }
});

router.post("/admin/withdrawals/:id/review", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await assertAdmin(req);
    const id = Number(req.params.id);
    const note = String(req.body?.note || "").trim().slice(0, 500);
    if (!Number.isSafeInteger(id) || id <= 0 || !note) {
      throw new WalletError(400, "Valid ID and review note required.");
    }
    const [row] = await db
      .update(withdrawalsTable)
      .set({ status: "review", adminNote: `[admin #${req.userId}] ${note}`.slice(0, 500), processedAt: new Date() })
      .where(and(eq(withdrawalsTable.id, id), inArray(withdrawalsTable.status, OPEN_STATUSES)))
      .returning();
    if (!row) throw new WalletError(409, "Request is not awaiting processing.");
    return res.json({ success: true, withdrawal: row });
  } catch (error) {
    return fail(res, error);
  }
});

// Reject only after verifying no payout happened. Restores wallet + earned balance exactly once.
router.post("/admin/withdrawals/:id/reject", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await assertAdmin(req);
    const id = Number(req.params.id);
    const note = String(req.body?.note || "").trim().slice(0, 500);
    if (!Number.isSafeInteger(id) || id <= 0 || !note) {
      throw new WalletError(400, "Valid ID and rejection reason required.");
    }

    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id));
      if (!row) throw new WalletError(404, "Withdrawal not found.");
      if (!OPEN_STATUSES.includes(row.status)) {
        throw new WalletError(409, "Only an unpaid request can be rejected.");
      }

      const [claimed] = await tx
        .update(withdrawalsTable)
        .set({
          status: "rejected",
          adminNote: `[admin #${req.userId}] ${note}`.slice(0, 500),
          resolvedAt: new Date(),
          reserveStatus: "not_applicable",
        })
        .where(and(eq(withdrawalsTable.id, id), inArray(withdrawalsTable.status, OPEN_STATUSES)))
        .returning({ id: withdrawalsTable.id });
      if (!claimed) throw new WalletError(409, "Request was already resolved.");

      await tx
        .update(usersTable)
        .set({
          credits: sql`${usersTable.credits} + ${row.requestedAmount}`,
          earnedBalance: sql`COALESCE(${usersTable.earnedBalance}, 0) + ${row.requestedAmount}`,
        } as any)
        .where(eq(usersTable.id, row.userId));

      await tx.insert(transactionsTable).values({
        userId: row.userId,
        amount: row.requestedAmount,
        type: "withdrawal_refund",
        description: `Withdrawal #${id} rejected; ${row.requestedAmount} credits returned. ${note}`,
        createdAt: new Date(),
      });
    });
    return res.json({ success: true, message: "Rejected request refunded in full." });
  } catch (error) {
    return fail(res, error);
  }
});

// ───────────────────────── Reserve release (cron) ─────────────────────────

/** Callable directly from node-cron (no HTTP needed) or via the secured endpoint below. */
export async function releaseDueReserves(batchSize = 200, maxBatches = 20) {
  let total = 0;

  for (let i = 0; i < maxBatches; i++) {
    const due = await db
      .select()
      .from(withdrawalsTable)
      .where(
        and(
          eq(withdrawalsTable.status, "paid"),
          eq(withdrawalsTable.reserveStatus, "locked"),
          lte(withdrawalsTable.reserveReleaseAt, new Date()),
        ),
      )
      .limit(batchSize);

    if (!due.length) break;

    let releasedInBatch = 0;
    for (const row of due) {
      try {
        const didRelease = await db.transaction(async (tx) => {
          const [claim] = await tx
            .update(withdrawalsTable)
            .set({ reserveStatus: "released", reserveReleasedAt: new Date() })
            .where(
              and(
                eq(withdrawalsTable.id, row.id),
                eq(withdrawalsTable.status, "paid"),
                eq(withdrawalsTable.reserveStatus, "locked"),
                lte(withdrawalsTable.reserveReleaseAt, new Date()),
              ),
            )
            .returning({ id: withdrawalsTable.id });
          if (!claim) return false;

          await tx
            .update(usersTable)
            .set({
              credits: sql`${usersTable.credits} + ${row.reserveAmount}`,
              earnedBalance: sql`COALESCE(${usersTable.earnedBalance}, 0) + ${row.reserveAmount}`,
            } as any)
            .where(eq(usersTable.id, row.userId));

          await tx.insert(transactionsTable).values({
            userId: row.userId,
            amount: row.reserveAmount,
            type: "withdrawal_reserve_released",
            description: `${row.reserveAmount} credits first-withdrawal reserve released for withdrawal #${row.id}.`,
            createdAt: new Date(),
          });
          return true;
        });
        if (didRelease) releasedInBatch++;
      } catch (err) {
        // One bad row must not block the rest.
        console.error(`[wallet] reserve release failed for withdrawal #${row.id}`, err);
      }
    }

    total += releasedInBatch;
    if (releasedInBatch === 0 || due.length < batchSize) break;
  }

  return total;
}

// Call daily with header x-cron-secret.
router.post("/system/cron/release-reserves", async (req: Request, res: Response) => {
  try {
    if (!CRON_SECRET) return res.status(503).json({ error: "Cron is not configured." });

    // Compare hashes → equal length always, no length leak.
    const supplied = sha(String(req.headers["x-cron-secret"] || ""));
    const expected = sha(CRON_SECRET);
    if (!timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const released = await releaseDueReserves();
    return res.json({ success: true, released });
  } catch (error) {
    return fail(res, error);
  }
});

export default router;