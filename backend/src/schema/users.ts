import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  skillsTeach: text("skills_teach").array().default([]),
  skillsLearn: text("skills_learn").array().default([]),
  credits: integer("credits").default(200),
  trustScore: integer("trust_score").default(0),
  sessionsCompleted: integer("sessions_completed").default(0),
  averageRating: real("average_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});
