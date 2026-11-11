import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * User-submitted reports for abuse, spam, fake profiles, etc.
 *
 * A reporter can have only one PENDING report against the same user.
 * After an admin marks it reviewed/dismissed, a new report is allowed.
 */
export const reportsTable = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id").notNull(),
    reportedUserId: integer("reported_user_id").notNull(),
    reason: text("reason").notNull(),
    message: text("message"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    reporterIdx: index("reports_reporter_id_idx").on(table.reporterId),
    reportedUserIdx: index("reports_reported_user_id_idx").on(table.reportedUserId),
    statusCreatedIdx: index("reports_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    onePendingReportPerPair: uniqueIndex(
      "reports_one_pending_per_reporter_target_uq",
    )
      .on(table.reporterId, table.reportedUserId)
      .where(sql`${table.status} = 'pending'`),
  }),
);
