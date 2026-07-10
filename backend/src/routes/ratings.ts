import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { sessionsTable, usersTable } from "../schema/index.js";

const ratingsTable = pgTable("ratings", {
  id:        serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  mentorId:  integer("mentor_id").notNull(),
  rating:    integer("rating").notNull(),
  review:    text("review"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  raterId:   integer("rater_id"),
});

const router: IRouter = Router();

// GET /api/ratings/mentor/:mentorId
router.get("/mentor/:mentorId", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    const ratings = await db
      .select()
      .from(ratingsTable)
      .where(eq(ratingsTable.mentorId, mentorId))
      .orderBy(desc(ratingsTable.createdAt));
    res.json(ratings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ratings
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { sessionId, mentorId, rating, review } = z.object({
      sessionId: z.number(),
      mentorId:  z.number(),
      rating:    z.number().min(1).max(5),
      review:    z.string().max(500).optional(),
    }).parse(req.body);

    // Verify the rater actually took this session with this mentor,
    // and that the session is done — otherwise anyone could fake-rate anyone.
    const [session] = await db.select().from(sessionsTable).where(
      and(eq(sessionsTable.id, sessionId), eq(sessionsTable.mentorId, mentorId))
    );
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId !== req.userId!) {
      return res.status(403).json({ error: "Only the student who took this session can rate it" });
    }
    if (!["completed", "pending_clearance"].includes(session.status)) {
      return res.status(400).json({ error: "Session must be completed before rating" });
    }

    // 🔥 FIX: Duplicate-rating guard — pehle ye check nahi tha, ek session pe
    // unlimited baar rating submit ho sakti thi (fake-review spam risk).
    if ((session as any).teacherRating) {
      return res.status(400).json({ error: "You've already rated this session" });
    }

    const [r] = await db.insert(ratingsTable).values({
      sessionId, mentorId, rating,
      review: review ?? null,
      raterId: req.userId!,
    }).returning();

    // 🔥 FIX: Session pe flag set karo (duplicate-check aur frontend "already
    // rated" button hide dono isi field pe depend karte hain — pehle ye kabhi
    // set hi nahi hota tha kyunki asli insert yahan, is route me hota hai).
    await db.update(sessionsTable)
      .set({ teacherRating: rating, teacherReview: review ?? null } as any)
      .where(eq(sessionsTable.id, sessionId));

    // 🔥 FIX: Mentor ka averageRating ab real reviews se calculate hoke
    // actually save hota hai — pehle ye column kabhi update hi nahi hota tha,
    // isliye Discover/Explore/Profile pe hamesha purana/default rating dikhta rehta.
    const allMentorRatings = await db.select({ rating: ratingsTable.rating })
      .from(ratingsTable).where(eq(ratingsTable.mentorId, mentorId));
    const newAvg = allMentorRatings.length > 0
      ? Math.round((allMentorRatings.reduce((sum, x) => sum + x.rating, 0) / allMentorRatings.length) * 10) / 10
      : rating;
    await db.update(usersTable).set({ averageRating: newAvg } as any).where(eq(usersTable.id, mentorId));

    res.status(201).json(r);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
});

export default router;