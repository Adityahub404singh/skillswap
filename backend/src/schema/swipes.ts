import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const swipesTable = pgTable("swipes", {
    id: serial("id").primaryKey(),
    swiperId: integer("swiper_id").notNull(),
    swipedOnId: integer("swiped_on_id").notNull(),
    // 🔥 FIX: Code 'action' bolega, DB se 'direction' column aayega
    action: varchar("direction", { length: 10 }).notNull(), 
    createdAt: timestamp("created_at").defaultNow(),
});