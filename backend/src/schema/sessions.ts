import { pgTable, text, serial, integer, timestamp, real, varchar,boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

export const sessionsTable = pgTable("sessions", {
  id:             serial("id").primaryKey(),
  mentorId:       integer("mentor_id").notNull(),
  studentId:      integer("student_id").notNull(),
  skill:          text("skill").notNull(),
  scheduledDate:  timestamp("scheduled_date").notNull(),
  duration:       integer("duration").notNull().default(60),
  status:         text("status").notNull().default("requested"),
  message:        text("message"),
  meetLink:       text("meet_link"),
  creditsAmount:  integer("credits_amount").notNull().default(10),
  startedAt:      timestamp("started_at"),
  completedAt:    timestamp("completed_at"),
  actualDuration: integer("actual_duration"),
  isGroup:        integer("is_group").default(0),
  maxStudents:    integer("max_students").default(1),
  isNegotiatedPrice: boolean("is_negotiated_price").default(false), // ← DB naam
  sessionType:    varchar("session_type", { length: 20 }).notNull().default("standard"),
  cancelReason:   text("cancel_reason"),
  teacherRating:  real("teacher_rating"),
  learnerRating:  real("learner_rating"),
  teacherReview:  text("teacher_review"),
  learnerReview:  text("learner_review"),
  sessionOtp:     text("session_otp"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  isMentorConfirmed:  boolean("is_mentor_confirmed").default(false),  // ← DB naam
  isStudentConfirmed: boolean("is_student_confirmed").default(false), // ← DB naam
  isFlagged:      boolean("is_flagged").default(false),               // ← DB naam
  flagReason:     text("flag_reason"),
  escrowAmount:   integer("escrow_amount"),   // ← add kiya
  paymentStatus:  text("payment_status"),     // ← add kiya
  disputeReason:  text("dispute_reason"),     // ← add kiya
  scheduledAt:    timestamp("scheduled_at"),  // ← add kiya
});

export const insertSessionSchema = z.object({
  mentorId:      z.number().int(),
  studentId:     z.number().int(),
  skill:         z.string().min(1),
  scheduledDate: z.coerce.date(),
  duration:      z.number().int().default(60),
  message:       z.string().optional(),
  creditsAmount: z.number().int().default(10),
  meetLink:      z.string().optional(),
  isGroup:       z.number().int().default(0),
  maxStudents:   z.number().int().default(1),
  negotiatedPrice: z.number().int().optional(),
  sessionType:   z.string().optional(),
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;