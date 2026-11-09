import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    amount: integer("amount").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    sessionId: integer("session_id"),
    // External idempotency key (e.g. the Razorpay payment id for type 'purchase').
    reference: text("reference"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // wallet history, quiz stats: WHERE user_id = ? ORDER BY created_at DESC
    userCreatedIdx: index("transactions_user_created_idx").on(t.userId, t.createdAt),
    // walletStats(): SUM(amount) WHERE user_id = ? AND type = 'earned'
    userTypeIdx: index("transactions_user_type_idx").on(t.userId, t.type),

    // A session can pay its mentor exactly once, even if a code bug or cron overlap tries twice.
    earnedOncePerSession: uniqueIndex("transactions_earned_once_per_session_uq")
      .on(t.sessionId)
      .where(sql`${t.type} = 'earned'`),

    // The same external payment can never be credited twice.
    typeReferenceUq: uniqueIndex("transactions_type_reference_uq")
      .on(t.type, t.reference)
      .where(sql`${t.reference} IS NOT NULL`),
  }),
);