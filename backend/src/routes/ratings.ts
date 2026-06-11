import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";
import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";

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

    const [r] = await db.insert(ratingsTable).values({
      sessionId, mentorId, rating,
      review: review ?? null,
      raterId: req.userId!,
    }).returning();
    res.status(201).json(r);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

