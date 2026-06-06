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

export async function createNotification(userId: number, type: string, title: string, message: string, actionUrl?: string) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, actionUrl: actionUrl ?? null });
  } catch (err: any) { 
    console.error("[notify]", err.message); 
  }
}

export const notify = {
  sessionBooked: (mentorId: number, learnerName: string, skill: string) => createNotification(mentorId, "session", "New Session Booked!", learnerName + " booked " + skill + " session.", "/sessions"),
  sessionAccepted: (learnerId: number, mentorName: string, skill: string) => createNotification(learnerId, "session", "Session Accepted!", mentorName + " accepted your " + skill + " request.", "/sessions"),
  sessionCompleted: (userId: number, skill: string, credits: number) => createNotification(userId, "credit", "Session Done!", skill + " session complete! +" + credits + " credits.", "/wallet"),
  sessionCancelled: (userId: number, skill: string, credits: number) => createNotification(userId, "session", "Session Cancelled", skill + " cancelled. +" + credits + " credits refunded.", "/wallet"),
  creditsEarned: (userId: number, amount: number, reason: string) => createNotification(userId, "credit", "+" + amount + " Credits!", reason, "/wallet"),
  streakBonus: (userId: number, streak: number, bonus: number) => createNotification(userId, "streak", streak + "-Day Streak!", "Amazing streak! +" + bonus + " bonus credits.", "/dashboard"),
  paymentSuccess: (userId: number, credits: number, amount: number) => createNotification(userId, "credit", "Payment Done!", credits + " credits added for Rs." + amount, "/wallet"),
};
