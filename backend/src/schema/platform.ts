import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";


export const feedbacksTable = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  rating: integer("rating").notNull(),
  text: text("text").notNull(),
  isFbRead: boolean("is_fb_read").default(false), // ← DB mein "is_fb_read" hai, "is_read" nahi!
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  source: text("source").default("footer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
