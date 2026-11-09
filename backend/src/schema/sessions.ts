import { pgTable, text, serial, integer, timestamp, real, varchar, boolean, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const sessionsTable = pgTable("sessions", {
  id:               serial("id").primaryKey(),
  // NOTE: 0 is used as "unassigned" sentinel (group classes -> studentId 0, doubts -> mentorId 0),
  // so FKs can't be added until these become nullable. Future refactor.
  mentorId:         integer("mentor_id").notNull(),
  studentId:        integer("student_id").notNull(),
  skill:            text("skill").notNull(),
  scheduledDate:    timestamp("scheduled_date").notNull(),
  duration:         integer("duration").notNull().default(60),
  status:           text("status").notNull().default("requested"),
  message:          text("message"),
  meetLink:         text("meet_link"),
  creditsAmount:    integer("credits_amount").notNull().default(10),
  startedAt:        timestamp("started_at"),
  completedAt:      timestamp("completed_at"),
  actualDuration:   integer("actual_duration"),
  isGroup:          integer("is_group").default(0),
  maxStudents:      integer("max_students").default(1),
  isNegotiatedPrice: boolean("is_negotiated_price").default(false),
  sessionType:      varchar("session_type", { length: 20 }).notNull().default("standard"),
  cancelReason:     text("cancel_reason"),
  teacherRating:    real("teacher_rating"),
  learnerRating:    real("learner_rating"),
  teacherReview:    text("teacher_review"),
  learnerReview:    text("learner_review"),
  sessionOtp:       text("session_otp"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  isMentorConfirmed:  boolean("is_mentor_confirmed").default(false),
  isStudentConfirmed: boolean("is_student_confirmed").default(false),
  isFlagged:        boolean("is_flagged").default(false),
  flagReason:       text("flag_reason"),
  escrowAmount:     integer("escrow_amount"),
  paymentStatus:    text("payment_status"),
  disputeReason:    text("dispute_reason"),
  scheduledAt:      timestamp("scheduled_at"),
  activeMinutes:    real("active_minutes").default(0),
  lastHeartbeatAt:  timestamp("last_heartbeat_at"),
}, (table) => ({
  mentorIdx:  index("sessions_mentor_idx").on(table.mentorId),
  studentIdx: index("sessions_student_idx").on(table.studentId),
  statusIdx:  index("sessions_status_idx").on(table.status),

  // expireStale(): status IN (...) AND scheduled_date <= ?
  statusScheduledIdx: index("sessions_status_scheduled_idx").on(table.status, table.scheduledDate),
  // clearEscrow(): status = 'pending_clearance' AND completed_at <= ?
  statusCompletedIdx: index("sessions_status_completed_idx").on(table.status, table.completedAt),
  // mentorHasConflict(): mentor_id = ? AND scheduled_date BETWEEN ...
  mentorScheduledIdx: index("sessions_mentor_scheduled_idx").on(table.mentorId, table.scheduledDate),
  // checkVelocityAndCollusion(): student_id = ? AND mentor_id = ? AND created_at >= ?
  pairCreatedIdx: index("sessions_pair_created_idx").on(table.studentId, table.mentorId, table.createdAt),

  creditsValid:  check("sessions_credits_chk",  sql`${table.creditsAmount} >= 0`),
  durationValid: check("sessions_duration_chk", sql`${table.duration} > 0`),
  statusValid:   check(
    "sessions_status_chk",
    sql`${table.status} IN ('pending','requested','accepted','in_progress','pending_clearance','completed','cancelled','disputed')`,
  ),
}));

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