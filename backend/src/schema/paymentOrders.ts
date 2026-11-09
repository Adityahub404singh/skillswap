import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users.js";

export const paymentOrdersTable = pgTable(
  "payment_orders",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id),

    razorpayOrderId: text("razorpay_order_id").notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),

    packageId: text("package_id").notNull(),
    credits: integer("credits").notNull(),
    amountPaise: integer("amount_paise").notNull(),

    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("created"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    creditedAt: timestamp("credited_at"),
  },
  (table) => ({
    orderUnique: uniqueIndex(
      "payment_orders_razorpay_order_unique"
    ).on(table.razorpayOrderId),

    paymentUnique: uniqueIndex(
      "payment_orders_razorpay_payment_unique"
    ).on(table.razorpayPaymentId),
  })
);