import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull(),
  type:        varchar("type", { length: 30 }).notNull(),
  title:       varchar("title", { length: 200 }).notNull(),
  message:     text("message").notNull(),
  // 🔥 FIX: Code "isRead" use karega, DB "is_notif_read" dega
  isRead:      boolean("is_notif_read").default(false), 
  actionUrl:   varchar("action_url", { length: 300 }),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});