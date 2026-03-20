import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category"),
  description: text("description"),
  mentorCount: integer("mentor_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
