import { Router, type IRouter } from "express";
import { db, ratingsTable, sessionsTable, usersTable } from "@workspace/db";
import { eq, avg } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

const createRatingSchema = z.object({
  sessionId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  review: z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = createRatingSchema.parse(req.body);
    const studentId = req.userId!;

    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, body.sessionId)).limit(1);
    if (!session) {
      res.status(404).json({ error: "Not Found", message: "Session not found" });
      return;
    }

    if (session.studentId !== studentId) {
      res.status(403).json({ error: "Forbidden", message: "Only the student can rate a session" });
      return;
    }

    if (session.status !== "completed") {
      res.status(400).json({ error: "Bad Request", message: "Session must be completed before rating" });
      return;
    }

    const existing = await db.select().from(ratingsTable).where(eq(ratingsTable.sessionId, body.sessionId)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Bad Request", message: "Session already rated" });
      return;
    }

    const [rating] = await db.insert(ratingsTable).values({
      sessionId: body.sessionId,
      mentorId: session.mentorId,
      studentId,
      rating: body.rating,
      review: body.review,
    }).returning();

    const mentorRatings = await db.select().from(ratingsTable).where(eq(ratingsTable.mentorId, session.mentorId));
    const avgRating = mentorRatings.reduce((sum, r) => sum + r.rating, 0) / mentorRatings.length;
    const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, session.mentorId)).limit(1);
    const trustScore = avgRating * 10 + (mentor?.sessionsCompleted || 0);
    await db.update(usersTable)
      .set({ averageRating: avgRating, trustScore })
      .where(eq(usersTable.id, session.mentorId));

    const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);

    res.status(201).json({
      ...rating,
      studentName: student?.name || "Unknown",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Bad Request", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    if (isNaN(mentorId)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid mentor ID" });
      return;
    }

    const ratings = await db.select().from(ratingsTable).where(eq(ratingsTable.mentorId, mentorId));
    ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const withStudentNames = await Promise.all(ratings.map(async (r) => {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, r.studentId)).limit(1);
      return { ...r, studentName: student?.name || "Unknown" };
    }));

    res.json(withStudentNames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
