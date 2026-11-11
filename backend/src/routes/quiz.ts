import { Router } from "express";
import { createHash } from "node:crypto";
import { db } from "../db.js";
import { usersTable, transactionsTable } from "../schema/index.js";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { QUIZ_QUESTIONS } from "../data/quiz-questions.js";

const router = Router();

const DAILY_LIMIT = 10;
const REWARD = 2;
const PENALTY = 2;
const QUIZ_TYPES = ["quiz_reward", "quiz_penalty", "quiz_warning"] as const;
const QUIZ_ENABLED = process.env.QUIZ_REWARDS_ENABLED !== "false";

class QuizError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Start of the current IST calendar day, independent of server timezone. */
function istDayStart(): Date {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const DAY_MS = 86_400_000;
  return new Date(
    Math.floor((Date.now() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS,
  );
}

/** Auth middleware must provide a numeric users.id (serial / integer in this schema). */
function getUserId(req: AuthRequest): number {
  const userId = Number(req.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new QuizError(401, "Invalid login session. Please log in again.");
  }
  return userId;
}

/** Same user receives the same 10 questions for the whole IST calendar day. */
function getDailyQuestions(userId: number) {
  const istDate = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

  return QUIZ_QUESTIONS
    .map((question, index) => ({
      question,
      index,
      order: createHash("sha256")
        .update(`${istDate}:${userId}:${index}`)
        .digest("hex"),
    }))
    .sort((a, b) => a.order.localeCompare(b.order))
    .slice(0, DAILY_LIMIT)
    .map(({ question, index }) => ({ ...question, id: `q${index}` }));
}

function getQuestionId(description: string | null | undefined): string | null {
  return description?.match(/\[quiz-question:(q\d+)\]/)?.[1] ?? null;
}

async function getTodayTransactions(userId: number, executor: any = db) {
  return executor
    .select({
      type: transactionsTable.type,
      description: transactionsTable.description,
      amount: transactionsTable.amount,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.createdAt, istDayStart()),
        inArray(transactionsTable.type, [...QUIZ_TYPES]),
      ),
    );
}

// GET /api/quiz/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const rows = await getTodayTransactions(userId);

    const attempts = rows.length;
    const earned = rows
      .filter((row: any) => row.type === "quiz_reward")
      .reduce((total: number, row: any) => total + Math.max(0, Number(row.amount) || 0), 0);

    return res.json({ attempts, maxAttempts: DAILY_LIMIT, earned });
  } catch (error: any) {
    if (error instanceof QuizError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("[quiz] stats failed:", error);
    return res.status(500).json({ error: "Failed to load quiz stats" });
  }
});

// GET /api/quiz/questions
// The correct answer (ans) is never sent to the browser.
router.get("/questions", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!QUIZ_ENABLED) {
      return res.status(503).json({ error: "Quiz is temporarily paused. Please try again later." });
    }

    const userId = getUserId(req);
    const rows = await getTodayTransactions(userId);
    const attempts = rows.length;

    if (attempts >= DAILY_LIMIT) {
      return res.json({ questions: [], attempts, maxAttempts: DAILY_LIMIT });
    }

    const answeredIds = new Set(
      rows
        .map((row: any) => getQuestionId(row.description))
        .filter((id: string | null): id is string => Boolean(id)),
    );

    const questions = getDailyQuestions(userId)
      .filter((question) => !answeredIds.has(question.id))
      .map(({ id, category, q, options }) => ({ id, category, q, options }));

    return res.json({ questions, attempts, maxAttempts: DAILY_LIMIT });
  } catch (error: any) {
    if (error instanceof QuizError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("[quiz] questions failed:", error);
    return res.status(500).json({ error: "Failed to load quiz questions" });
  }
});

// POST /api/quiz/submit
// Request body: { questionId: "q12", selectedIndex: 2 }
// The server determines correctness. Never accept isCorrect from the client.
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!QUIZ_ENABLED) {
      return res.status(503).json({ error: "Quiz is temporarily paused. Please try again later." });
    }

    const { questionId, selectedIndex } = req.body ?? {};

    if (
      typeof questionId !== "string" ||
      !/^q\d+$/.test(questionId) ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3
    ) {
      return res.status(400).json({ error: "Invalid answer submission" });
    }

    const userId = getUserId(req);
    const question = getDailyQuestions(userId).find((item) => item.id === questionId);

    if (!question) {
      return res.status(400).json({ error: "Question is not available in today's quiz." });
    }

    const result = await db.transaction(async (tx) => {
      // Lock the user's row. Concurrent submissions for this user are serialized.
      const lockResult = await tx.execute(
        sql`SELECT COALESCE(credits, 0)::int AS credits FROM users WHERE id = ${userId} FOR UPDATE`,
      );

      if (!lockResult.rows.length) {
        throw new QuizError(404, "User not found");
      }

      const currentCredits = Math.max(
        0,
        Number((lockResult.rows[0] as { credits?: number | string }).credits) || 0,
      );

      const todayRows = await getTodayTransactions(userId, tx);

      if (todayRows.length >= DAILY_LIMIT) {
        throw new QuizError(400, `Daily limit of ${DAILY_LIMIT} questions reached. Come back tomorrow!`);
      }

      const duplicate = todayRows.some(
        (row: any) => getQuestionId(row.description) === questionId,
      );

      if (duplicate) {
        throw new QuizError(409, "You have already answered this question.");
      }

      const marker = `[quiz-question:${questionId}]`;
      const correct = selectedIndex === question.ans;

      if (correct) {
        await tx
          .update(usersTable)
          .set({
            credits: sql`COALESCE(${usersTable.credits}, 0) + ${REWARD}`,
          })
          .where(eq(usersTable.id, userId));

        await tx.insert(transactionsTable).values({
          userId,
          type: "quiz_reward",
          amount: REWARD,
          description: `${marker} Daily Quiz (+${REWARD} Credits)`,
        });

        return {
          status: "reward" as const,
          message: `Correct! +${REWARD} Credits ⚡`,
          correct: true,
        };
      }

      const wrongAnswersToday = todayRows.filter(
        (row: any) => row.type === "quiz_warning" || row.type === "quiz_penalty",
      ).length;

      // First wrong answer of the day: warning only.
      if (wrongAnswersToday === 0) {
        await tx.insert(transactionsTable).values({
          userId,
          type: "quiz_warning",
          amount: 0,
          description: `${marker} Quiz Warning (Wrong Answer)`,
        });

        return {
          status: "warning" as const,
          message: "Wrong answer! First warning, no credits deducted.",
          correct: false,
        };
      }

      // Second and subsequent wrong answers: deduct at most the available credits.
      const penalty = Math.min(PENALTY, currentCredits);

      if (penalty > 0) {
        await tx
          .update(usersTable)
          .set({
            credits: sql`GREATEST(COALESCE(${usersTable.credits}, 0) - ${penalty}, 0)`,
            earnedBalance: sql`LEAST(
              COALESCE(${usersTable.earnedBalance}, 0),
              GREATEST(COALESCE(${usersTable.credits}, 0) - ${penalty}, 0)
            )`,
          })
          .where(eq(usersTable.id, userId));
      }

      await tx.insert(transactionsTable).values({
        userId,
        type: "quiz_penalty",
        amount: -penalty,
        description: `${marker} Quiz Penalty (-${penalty} Credits)`,
      });

      return {
        status: "penalty" as const,
        message: penalty > 0
          ? `Wrong again! -${penalty} Credits deducted.`
          : "Wrong answer! No credits available for deduction.",
        correct: false,
      };
    });

    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof QuizError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("[quiz] submit failed:", error);
    return res.status(500).json({ error: "Failed to submit answer" });
  }
});

export default router;
