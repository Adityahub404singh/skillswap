import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  sessionId: integer("session_id"),
  sessionId: integer("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
