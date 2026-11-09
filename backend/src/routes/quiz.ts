import { Router } from "express";
import { db } from "../db.js";
import { usersTable, transactionsTable } from "../schema/index.js";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

const DAILY_LIMIT = 10;
const REWARD = 2;
const PENALTY = 2;
const QUIZ_TYPES = ["quiz_reward", "quiz_penalty", "quiz_warning"];

// Kill-switch: set QUIZ_REWARDS_ENABLED=false on Render to pause the quiz instantly.
const QUIZ_ENABLED = process.env.QUIZ_REWARDS_ENABLED !== "false";

class QuizError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Start of "today" in IST (UTC+5:30), independent of the server's timezone. */
function istDayStart() {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const DAY_MS = 86_400_000;
  const startIstMs = Math.floor((Date.now() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return new Date(startIstMs);
}

// GET DAILY STATS
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({ type: transactionsTable.type })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, req.userId!),
          gte(transactionsTable.createdAt, istDayStart()),
          inArray(transactionsTable.type, QUIZ_TYPES),
        ),
      );

    const attempts = rows.length;
    const earned = rows.filter((t) => t.type === "quiz_reward").length * REWARD;
    res.json({ attempts, maxAttempts: DAILY_LIMIT, earned });
  } catch (err) {
    console.error("[quiz] stats failed", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// SUBMIT ANSWER LOGIC
// !! SECURITY: `isCorrect` is sent by the CLIENT, so anyone can send true and farm credits.
// !! The answer must be verified on the server (serve questions from the server and check
// !! questionId + answer here). Until then, pause rewards with QUIZ_REWARDS_ENABLED=false.
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!QUIZ_ENABLED) {
      return res.status(503).json({ error: "Quiz is temporarily paused. Please try again later." });
    }

    // Strict boolean: the string "false" must never be treated as truthy.
    if (typeof req.body?.isCorrect !== "boolean") {
      return res.status(400).json({ error: "Invalid request" });
    }
    const isCorrect: boolean = req.body.isCorrect;
    const userId = req.userId!;

    const outcome = await db.transaction(async (tx) => {
      // Row lock: parallel requests from the same user queue up here, so the
      // daily limit below cannot be bypassed by firing many requests at once.
      const lock = await tx.execute(
        sql`SELECT COALESCE(credits, 0)::int AS credits FROM users WHERE id = ${userId} FOR UPDATE`,
      );
      if (!lock.rows.length) throw new QuizError(404, "User not found");
      const credits = Number((lock.rows[0] as any).credits);

      const todays = await tx
        .select({ type: transactionsTable.type })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.userId, userId),
            gte(transactionsTable.createdAt, istDayStart()),
            inArray(transactionsTable.type, QUIZ_TYPES),
          ),
        );

      if (todays.length >= DAILY_LIMIT) {
        throw new QuizError(400, `Daily limit of ${DAILY_LIMIT} questions reached. Come back tomorrow!`);
      }

      if (isCorrect) {
        await tx
          .update(usersTable)
          .set({ credits: sql`COALESCE(${usersTable.credits}, 0) + ${REWARD}` } as any)
          .where(eq(usersTable.id, userId));
        await tx.insert(transactionsTable).values({
          userId, type: "quiz_reward", amount: REWARD, description: `Daily Quiz (+${REWARD} Credits)`,
        });
        return { status: "reward", message: `Correct! +${REWARD} Credits ⚡` };
      }

      const warningsToday = todays.filter((t) => t.type === "quiz_warning").length;
      if (warningsToday === 0) {
        // First wrong answer of the day: warning only.
        await tx.insert(transactionsTable).values({
          userId, type: "quiz_warning", amount: 0, description: "Quiz Warning (Wrong Answer)",
        });
        return { status: "warning", message: "Wrong Answer! ⚠️ First warning, no credits deducted." };
      }

      // Second+ wrong answer: penalty. Never take more than the user has, and keep
      // earnedBalance <= credits so purchased credits can't become withdrawable.
      const penalty = Math.min(PENALTY, credits);
      if (penalty > 0) {
        await tx
          .update(usersTable)
          .set({
            credits: sql`${usersTable.credits} - ${penalty}`,
            earnedBalance: sql`LEAST(COALESCE(${usersTable.earnedBalance}, 0), ${usersTable.credits} - ${penalty})`,
          } as any)
          .where(eq(usersTable.id, userId));
      }
      await tx.insert(transactionsTable).values({
        userId, type: "quiz_penalty", amount: -penalty, description: `Quiz Penalty (-${penalty} Credits)`,
      });
      return { status: "penalty", message: `Wrong again! ❌ -${penalty} Credits deducted.` };
    });

    return res.json({ success: true, ...outcome });
  } catch (err: any) {
    if (err instanceof QuizError) return res.status(err.status).json({ error: err.message });
    console.error("[quiz] submit failed", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;