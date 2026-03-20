import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  raterId: integer("rater_id").notNull(),
  mentorId: integer("mentor_id").notNull(),
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});
