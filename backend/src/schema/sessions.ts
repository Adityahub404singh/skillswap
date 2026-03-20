import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull(),
  studentId: integer("student_id").notNull(),
  skill: text("skill").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").notNull().default(60),
  status: text("status").notNull().default("requested"),
  message: text("message"),
  creditsAmount: integer("credits_amount").notNull().default(10),
  meetLink: text("meet_link"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  actualDuration: integer("actual_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = z.object({
  mentorId: z.number().int(),
  studentId: z.number().int(),
  skill: z.string().min(1),
  scheduledDate: z.date(),
  duration: z.number().int().default(60),
  message: z.string().optional(),
  creditsAmount: z.number().int().default(10),
  meetLink: z.string().optional(),
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;