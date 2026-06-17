import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
  id:         serial("id").primaryKey().notNull(),
  senderId:   integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content:    text("content").notNull(),
  isMsgRead:  boolean("is_msg_read").default(false), // ← DB mein "is_msg_read" hai
  createdAt:  timestamp("created_at").defaultNow(),
});