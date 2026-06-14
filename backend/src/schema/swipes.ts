import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const swipes = pgTable("swipes", {
    id: serial("id").primaryKey().notNull(),
    swiperId: integer("swiper_id").notNull(), 
    swipedOnId: integer("swiped_on_id").notNull(), 
    action: text("action").notNull(), 
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const messages = pgTable("messages", {
    id: serial("id").primaryKey().notNull(),
    senderId: integer("sender_id").notNull(),
    receiverId: integer("receiver_id").notNull(),
    content: text("content").notNull(),
    isRead: integer("is_read").default(0),
    createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});