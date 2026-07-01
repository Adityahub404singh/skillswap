import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const groupEnrollmentsTable = pgTable("group_enrollments", {
  id:              serial("id").primaryKey(),
  sessionId:       integer("session_id").notNull(),
  studentId:       integer("student_id").notNull(),
  creditsAmount:   integer("credits_amount").notNull().default(0),
  status:          text("status").notNull().default("active"),
  activeSeconds:   integer("active_seconds").notNull().default(0),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  isConnected:     integer("is_connected").notNull().default(0),
  refundAmount:    integer("refund_amount").default(0),
  refundReason:    text("refund_reason"),
  refundedAt:      timestamp("refunded_at"),
  joinedAt:        timestamp("joined_at").notNull().defaultNow(),
  completedAt:     timestamp("completed_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // 🔥 SAFELY ADDED INDEXES (Bandwidth aur Speed ke liye)
  sessionIdx: index("group_enrollments_session_idx").on(table.sessionId),
  studentIdx: index("group_enrollments_student_idx").on(table.studentId),
}));