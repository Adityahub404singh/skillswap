import { db } from "./db.js";
import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

const notificationsTable = pgTable("notifications", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  type:      varchar("type", { length: 30 }).notNull(),
  title:     varchar("title", { length: 200 }).notNull(),
  message:   text("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  actionUrl: varchar("action_url", { length: 300 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export async function createNotification(userId, type, title, message, actionUrl) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, actionUrl: actionUrl ?? null });
  } catch (err) { console.error("[notify]", err.message); }
}

export const notify = {
  sessionBooked: (mentorId, learnerName, skill) => createNotification(mentorId, "session", "New Session Booked!", learnerName + " booked " + skill + " session.", "/sessions"),
  sessionAccepted: (learnerId, mentorName, skill) => createNotification(learnerId, "session", "Session Accepted!", mentorName + " accepted your " + skill + " request.", "/sessions"),
  sessionCompleted: (userId, skill, credits) => createNotification(userId, "credit", "Session Done!", skill + " session complete! +" + credits + " credits.", "/wallet"),
  sessionCancelled: (userId, skill, credits) => createNotification(userId, "session", "Session Cancelled", skill + " cancelled. +" + credits + " credits refunded.", "/wallet"),
  creditsEarned: (userId, amount, reason) => createNotification(userId, "credit", "+" + amount + " Credits!", reason, "/wallet"),
  streakBonus: (userId, streak, bonus) => createNotification(userId, "streak", streak + "-Day Streak!", "Amazing streak! +" + bonus + " bonus credits.", "/dashboard"),
  paymentSuccess: (userId, credits, amount) => createNotification(userId, "credit", "Payment Done!", credits + " credits added for Rs." + amount, "/wallet"),
};