import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// 🔥 NEW: User-submitted reports (abuse, spam, fake profile, etc.)
export const reportsTable = pgTable("reports", {
  id:             serial("id").primaryKey(),
  reporterId:     integer("reporter_id").notNull(),
  reportedUserId: integer("reported_user_id").notNull(),
  reason:         text("reason").notNull(),        // "spam" | "abuse" | "fake_profile" | "inappropriate" | "other"
  message:        text("message"),
  status:         text("status").notNull().default("pending"), // "pending" | "reviewed" | "dismissed"
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});