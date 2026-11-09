import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.js";

export const withdrawalsTable = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    // Financial record: keep default NO ACTION so a user with withdrawals can't be hard-deleted.
    userId: integer("user_id").notNull().references(() => usersTable.id),
    requestedAmount: integer("requested_amount").notNull(),
    platformFee: integer("platform_fee").notNull(),
    reserveAmount: integer("reserve_amount").notNull().default(0),
    payoutAmount: integer("payout_amount").notNull(),
    upiId: text("upi_id").notNull(),
    status: text("status").notNull().default("requested"),
    payoutReference: text("payout_reference"),
    adminNote: text("admin_note"),
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    paidAt: timestamp("paid_at"),
    reserveReleaseAt: timestamp("reserve_release_at"),
    reserveStatus: text("reserve_status").notNull().default("not_applicable"),
    reserveReleasedAt: timestamp("reserve_released_at"),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => ({
    // list queries: WHERE user_id = ? ORDER BY requested_at DESC
    userIdx: index("withdrawals_user_requested_idx").on(t.userId, t.requestedAt),
    statusIdx: index("withdrawals_status_idx").on(t.status),
    reserveIdx: index("withdrawals_reserve_release_idx").on(t.reserveStatus, t.reserveReleaseAt),

    // Same UTR can never be used twice (multiple NULLs are allowed in Postgres).
    payoutRefUq: uniqueIndex("withdrawals_payout_reference_uq").on(t.payoutReference),

    // DB-level guarantee: max ONE open withdrawal per user.
    oneOpenPerUser: uniqueIndex("withdrawals_one_open_per_user_uq")
      .on(t.userId)
      .where(sql`${t.status} IN ('requested','processing','review')`),

    amountsValid: check(
      "withdrawals_amounts_chk",
      sql`${t.requestedAmount} > 0 AND ${t.payoutAmount} > 0 AND ${t.platformFee} >= 0 AND ${t.reserveAmount} >= 0`,
    ),
    statusValid: check(
      "withdrawals_status_chk",
      sql`${t.status} IN ('requested','processing','review','paid','rejected')`,
    ),
    reserveStatusValid: check(
      "withdrawals_reserve_status_chk",
      sql`${t.reserveStatus} IN ('not_applicable','awaiting_payout','locked','released')`,
    ),
  }),
);