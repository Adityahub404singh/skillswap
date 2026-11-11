import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import {
  ratingsTable,
  sessionsTable,
  usersTable,
} from "../schema/index.js";
import { z } from "zod";

const router: IRouter = Router();

const RATEABLE_STATUSES = ["pending_clearance", "completed"];

const createRatingSchema = z
  .object({
    sessionId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(400).optional().default(""),
  })
  .strict();

function getAuthenticatedUserId(req: AuthRequest): number | null {
  const id = Number(req.userId);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * GET /api/ratings/mentor/:mentorId
 *
 * Public endpoint.
 * Returns reviews and public reviewer names for a mentor.
 */
router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const mentorId = Number(req.params.mentorId);

    if (!Number.isSafeInteger(mentorId) || mentorId <= 0) {
      return res.status(400).json({
        error: "Invalid mentor ID",
      });
    }

    const ratings = await db
      .select({
        id: ratingsTable.id,
        sessionId: ratingsTable.sessionId,
        mentorId: ratingsTable.mentorId,
        studentId: ratingsTable.raterId,
        rating: ratingsTable.rating,
        review: ratingsTable.review,
        studentName: usersTable.name,
        createdAt: ratingsTable.createdAt,
      })
      .from(ratingsTable)
      .innerJoin(
        usersTable,
        eq(ratingsTable.raterId, usersTable.id),
      )
      .where(eq(ratingsTable.mentorId, mentorId))
      .orderBy(desc(ratingsTable.createdAt))
      .limit(100);

    return res.json(ratings);
  } catch (error) {
    console.error("[ratings] list failed:", error);

    return res.status(500).json({
      error: "Failed to load ratings",
    });
  }
});

/**
 * POST /api/ratings
 *
 * Authenticated student can rate their own completed/ended
 * one-to-one session.
 *
 * Mentor ID is derived from the session, never trusted from client.
 */
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const raterId = getAuthenticatedUserId(req);

    if (!raterId) {
      return res.status(401).json({
        error: "Invalid login session. Please log in again.",
      });
    }

    const parsed = createRatingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid rating details",
        details: parsed.error.flatten(),
      });
    }

    const { sessionId, rating, review } = parsed.data;
    const cleanReview = review.trim() || null;

    const result = await db.transaction(async (tx) => {
      // Lock the session to serialize rating requests for this session.
      const [session] = await tx
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.id, sessionId))
        .for("update")
        .limit(1);

      if (!session) {
        return {
          error: "Session not found",
          status: 404 as const,
        };
      }

      // Only the actual student of this session can rate.
      if (Number(session.studentId) !== raterId) {
        return {
          error: "Only the student who took this session can rate it.",
          status: 403 as const,
        };
      }

      // Group sessions are not supported by this rating flow.
      if (Number(session.isGroup ?? 0) === 1) {
        return {
          error: "Group sessions cannot be rated through this form.",
          status: 400 as const,
        };
      }

      if (!RATEABLE_STATUSES.includes(session.status)) {
        return {
          error: "Only ended sessions can be rated.",
          status: 400 as const,
        };
      }

      const mentorId = Number(session.mentorId);

      if (!Number.isSafeInteger(mentorId) || mentorId <= 0) {
        return {
          error: "Invalid mentor for this session.",
          status: 400 as const,
        };
      }

      // Legacy session-level duplicate check.
      if (session.teacherRating != null) {
        return {
          error: "You've already rated this session.",
          status: 409 as const,
        };
      }

      // Check the ratings table as well.
      const [existing] = await tx
        .select({
          id: ratingsTable.id,
        })
        .from(ratingsTable)
        .where(eq(ratingsTable.sessionId, sessionId))
        .limit(1);

      if (existing) {
        return {
          error: "This session has already been rated.",
          status: 409 as const,
        };
      }

      // Lock mentor row before recalculating the average.
      const [mentor] = await tx
        .select({
          id: usersTable.id,
        })
        .from(usersTable)
        .where(eq(usersTable.id, mentorId))
        .for("update")
        .limit(1);

      if (!mentor) {
        return {
          error: "Mentor not found.",
          status: 404 as const,
        };
      }

      const [created] = await tx
        .insert(ratingsTable)
        .values({
          sessionId,
          raterId,
          mentorId,
          rating,
          review: cleanReview,
        })
        .returning({
          id: ratingsTable.id,
          sessionId: ratingsTable.sessionId,
          mentorId: ratingsTable.mentorId,
          studentId: ratingsTable.raterId,
          rating: ratingsTable.rating,
          review: ratingsTable.review,
          createdAt: ratingsTable.createdAt,
        });

      // Keep session-level rating fields synchronized.
      await tx
        .update(sessionsTable)
        .set({
          teacherRating: rating,
          teacherReview: cleanReview,
        })
        .where(eq(sessionsTable.id, sessionId));

      // Recalculate mentor average from actual rating records.
      const [aggregate] = await tx
        .select({
          average: sql<number>`
            COALESCE(AVG(${ratingsTable.rating}), 0)::float
          `,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(ratingsTable)
        .where(eq(ratingsTable.mentorId, mentorId));

      const averageRating =
        Math.round(Number(aggregate?.average ?? 0) * 10) / 10;

      const totalRatings = Number(aggregate?.count ?? 0);

      await tx
        .update(usersTable)
        .set({
          averageRating,
        })
        .where(eq(usersTable.id, mentorId));

      return {
        created,
        averageRating,
        totalRatings,
      };
    });

    if ("error" in result) {
      return res.status(result.status).json({
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      rating: result.created,
      averageRating: result.averageRating,
      totalRatings: result.totalRatings,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "This session has already been rated.",
      });
    }

    console.error("[ratings] create failed:", error);

    return res.status(500).json({
      error: "Failed to submit rating. Please try again.",
    });
  }
});

export default router;