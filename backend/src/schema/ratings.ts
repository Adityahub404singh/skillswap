import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ratingsTable = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),

    // One rating per session
    sessionId: integer("session_id").notNull(),

    // Student who submitted the rating
    raterId: integer("rater_id").notNull(),

    // Mentor receiving the rating
    mentorId: integer("mentor_id").notNull(),

    rating: integer("rating").notNull(),
    review: text("review"),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    oneRatingPerSession: uniqueIndex("ratings_session_id_uq").on(
      table.sessionId,
    ),

    mentorCreatedIdx: index("ratings_mentor_created_idx").on(
      table.mentorId,
      table.createdAt,
    ),

    raterIdx: index("ratings_rater_id_idx").on(table.raterId),

    ratingRangeCheck: check(
      "ratings_rating_range_check",
      sql`${table.rating} BETWEEN 1 AND 5`,
    ),
  }),
);

export type Rating = typeof ratingsTable.$inferSelect;
export type InsertRating = typeof ratingsTable.$inferInsert;